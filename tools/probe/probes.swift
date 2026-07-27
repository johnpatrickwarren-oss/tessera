// tools/probe/probes.swift — the Apple Silicon probe trio (SPEC-probe-pilot-apple-silicon.md § 2).
//
// ONE compiled binary, no dependencies beyond Metal.framework, because the duration channel is a
// score: a JIT-warmed Node kernel would fold compiler state into the very quantity being ranked.
// Swift default (strict) FP semantics — no -ffast-math analogue — so P4's checksum is
// bit-deterministic in its fixed evaluation order on any Apple Silicon chip.
//
// Correctness references, per probe:
//   P1-int  golden constant baked into this source (below). Integer ops are architecturally
//           deterministic on arm64; a mismatch is an SDC signal, not tolerance noise.
//   P4-mem  golden constant baked likewise (strict IEEE, fixed order ⇒ exact double equality).
//   P5-gpu  NO baked constant: the CPU replays the identical integer kernel and the two results
//           must agree exactly — an independent CPU-vs-GPU cross-check on every execution, which
//           is precisely the SDC contract the fleet's dcgmi ladder provides.
//   The baked goldens are versioned by the binary hash, which is part of the block key; changing
//   any kernel parameter changes both together. Bake via `probes --golden` → paste → rebuild.
//
// Output: one JSON line per probe on stdout:
//   {"probe":"p1int","duration_ns":…,"errors":0,"checksum":"…"}
// Exit code 0 = ran (errors field carries SDC count); nonzero = probe could not run at all.
//
// Usage: probes <p1|p4|p5|all> [--golden]

import Foundation
import Metal

// ── P1-int: integer/branch/bit-twiddle loop, ~100 ms single-thread ──────────────────────────────

let P1_ITERS = 400_000_000
let P1_GOLDEN: UInt64? = 0xc865ff33d0411e53  // baked 2026-07-27, Apple Swift 6.3.2 -O

func p1Kernel() -> UInt64 {
    var x: UInt64 = 0x9E37_79B9_7F4A_7C15
    var acc: UInt64 = 0
    for i in 0..<P1_ITERS {
        x ^= x << 13
        x ^= x >> 7
        x ^= x << 17
        x = x &* 0xBF58_476D_1CE4_E5B9 &+ UInt64(i)
        acc = (acc &+ x) ^ ((acc << 9) | (acc >> 55))
    }
    return acc
}

// ── P4-mem: STREAM triad over buffers ≫ any cluster's L2, fixed order, exact FP checksum ────────

let P4_N = 8_388_608           // 8M doubles × 3 arrays = 192 MB working set
let P4_PASSES = 8
let P4_GOLDEN: Double? = Double(bitPattern: 0x40a06022d14a0a06)  // baked 2026-07-27; BIT pattern, not decimal — a %.9f round-trip is lossy and the compare is exact

func p4Kernel() -> Double {
    var a = [Double](repeating: 0, count: P4_N)
    var b = [Double](repeating: 0, count: P4_N)
    var c = [Double](repeating: 0, count: P4_N)
    for i in 0..<P4_N {
        b[i] = Double(i % 1024) * 0.001
        c[i] = Double((i &* 2654435761) % 4096) * 0.0005
    }
    let s = 0.5
    for _ in 0..<P4_PASSES {
        a.withUnsafeMutableBufferPointer { ap in
            b.withUnsafeBufferPointer { bp in
                c.withUnsafeBufferPointer { cp in
                    for i in 0..<P4_N { ap[i] = bp[i] + s * cp[i] }
                }
            }
        }
    }
    var sum = 0.0
    var i = 0
    // PRIME strides. 4096 resonated with BOTH init moduli (1024 | i and 4096 | i·k) and sampled
    // exactly the zero entries — the first golden bake printed 0.000000000. A checksum that can
    // silently sample a measure-zero slice is the N11 bug class in miniature.
    while i < P4_N { sum += a[i]; i += 4093 }   // strided, fixed order
    for i in stride(from: 0, to: P4_N, by: 1_048_573) { sum += a[i] * 1e-3 }
    return sum
}

// ── P5-gpu: Metal integer-hash kernel, XOR-reduced (order-independent), CPU replay cross-check ──

let P5_THREADS: UInt32 = 1 << 20
let P5_ROUNDS: UInt32 = 64
let P5_SLOTS = 256

let p5Source = """
#include <metal_stdlib>
using namespace metal;
kernel void mixk(device atomic_uint* slots [[buffer(0)]],
                 constant uint& rounds [[buffer(1)]],
                 uint gid [[thread_position_in_grid]]) {
    uint x = gid * 2654435761u + 1u;
    for (uint r = 0; r < rounds; r++) {
        x ^= x << 13; x ^= x >> 17; x ^= x << 5;
        x = x * 2246822519u + r;
    }
    atomic_fetch_xor_explicit(&slots[gid & 255u], x, memory_order_relaxed);
}
"""

func p5CpuReference() -> [UInt32] {
    var slots = [UInt32](repeating: 0, count: P5_SLOTS)
    for gid in 0..<P5_THREADS {
        var x = gid &* 2654435761 &+ 1
        for r in 0..<P5_ROUNDS {
            x ^= x << 13; x ^= x >> 17; x ^= x << 5
            x = x &* 2246822519 &+ r
        }
        slots[Int(gid & 255)] ^= x
    }
    return slots
}

func p5Kernel() throws -> (gpu: [UInt32], errors: Int) {
    guard let dev = MTLCreateSystemDefaultDevice(),
          let queue = dev.makeCommandQueue() else {
        throw NSError(domain: "probes", code: 2, userInfo: [NSLocalizedDescriptionKey: "no Metal device"])
    }
    let lib = try dev.makeLibrary(source: p5Source, options: nil)
    guard let fn = lib.makeFunction(name: "mixk") else {
        throw NSError(domain: "probes", code: 3, userInfo: [NSLocalizedDescriptionKey: "kernel missing"])
    }
    let pso = try dev.makeComputePipelineState(function: fn)
    guard let slotBuf = dev.makeBuffer(length: P5_SLOTS * 4, options: .storageModeShared),
          let cmd = queue.makeCommandBuffer(),
          let enc = cmd.makeComputeCommandEncoder() else {
        throw NSError(domain: "probes", code: 4, userInfo: [NSLocalizedDescriptionKey: "buffer/encoder failed"])
    }
    memset(slotBuf.contents(), 0, P5_SLOTS * 4)
    var rounds = P5_ROUNDS
    enc.setComputePipelineState(pso)
    enc.setBuffer(slotBuf, offset: 0, index: 0)
    enc.setBytes(&rounds, length: 4, index: 1)
    let w = pso.threadExecutionWidth
    enc.dispatchThreads(MTLSize(width: Int(P5_THREADS), height: 1, depth: 1),
                        threadsPerThreadgroup: MTLSize(width: w, height: 1, depth: 1))
    enc.endEncoding()
    cmd.commit()
    cmd.waitUntilCompleted()
    let out = slotBuf.contents().bindMemory(to: UInt32.self, capacity: P5_SLOTS)
    let gpu = Array(UnsafeBufferPointer(start: out, count: P5_SLOTS))
    let ref = p5CpuReference()
    var errors = 0
    for i in 0..<P5_SLOTS where gpu[i] != ref[i] { errors += 1 }
    return (gpu, errors)
}

// ── harness ─────────────────────────────────────────────────────────────────────────────────────

func nowNs() -> UInt64 { DispatchTime.now().uptimeNanoseconds }

func emit(probe: String, durationNs: UInt64, errors: Int, checksum: String) {
    print("{\"probe\":\"\(probe)\",\"duration_ns\":\(durationNs),\"errors\":\(errors),\"checksum\":\"\(checksum)\"}")
}

func runP1(golden: Bool) {
    let t0 = nowNs()
    let acc = p1Kernel()
    let dt = nowNs() - t0
    if golden { print("P1_GOLDEN = 0x\(String(acc, radix: 16))"); return }
    let errors = P1_GOLDEN.map { acc == $0 ? 0 : 1 } ?? -1  // -1 = golden unset; runner treats as invalid
    emit(probe: "p1int", durationNs: dt, errors: errors, checksum: String(acc, radix: 16))
}

func runP4(golden: Bool) {
    let t0 = nowNs()
    let sum = p4Kernel()
    let dt = nowNs() - t0
    if golden { print("P4_GOLDEN = Double(bitPattern: 0x\(String(sum.bitPattern, radix: 16)))"); return }
    let errors = P4_GOLDEN.map { sum == $0 ? 0 : 1 } ?? -1
    emit(probe: "p4mem", durationNs: dt, errors: errors, checksum: String(format: "%.9f", sum))
}

func runP5() {
    do {
        let t0 = nowNs()
        let (gpu, errors) = try p5Kernel()
        let dt = nowNs() - t0
        let fold = gpu.reduce(UInt32(0)) { $0 ^ $1 }
        emit(probe: "p5gpu", durationNs: dt, errors: errors, checksum: String(fold, radix: 16))
    } catch {
        FileHandle.standardError.write("p5gpu failed: \(error.localizedDescription)\n".data(using: .utf8)!)
        exit(2)
    }
}

let args = CommandLine.arguments.dropFirst()
let golden = args.contains("--golden")
let which = args.first ?? "all"
switch which {
case "p1": runP1(golden: golden)
case "p4": runP4(golden: golden)
case "p5": runP5()
case "all", "--golden":
    runP1(golden: golden); runP4(golden: golden); if !golden { runP5() }
default:
    FileHandle.standardError.write("usage: probes <p1|p4|p5|all> [--golden]\n".data(using: .utf8)!)
    exit(64)
}
