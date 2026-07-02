# R79 — mismatched-DGP falsification boundary for the oracle-baseline coverage numbers

Family-A betting detector, ORACLE params (0/1), α=0.005, 200 windows, 200 trials/arm.
`null FPR` = fires on a FAULT-FREE stream of that DGP (any fire in the window). The iid row is
the R72/R77 operating regime; every other row is a null the oracle-DGP matrices never test.
The production pipelines interpose baselining/whitening/common-mode removal + the Wall-A gate —
this matrix documents what the R72/R77 numbers alone do NOT claim (2026-07-02 audit F12).

| DGP | null FPR | ramp(0.05/w) detection |
|---|---|---|
| iid-gaussian | 0.000 | 1.000 |
| ar1-rho0.5 | 0.165 | 1.000 |
| ar1-rho0.9 | 0.905 | 1.000 |
| ar1-rho0.95 | 0.940 | 1.000 |
| t3-tails | 0.005 | 1.000 |
| regime-step | 0.980 | 1.000 |
| diurnal | 0.000 | 1.000 |
