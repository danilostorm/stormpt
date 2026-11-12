# StormPT x64 client/launcher staging checkpoint — 2026-11-12

This is a staging-only checkpoint. No production cutover was performed.

## Candidate artifacts

- Game.exe: AMD64, 8,748,544 bytes, SHA-256 `74782F10B7C9752E9BBCBFB41BD46C584E5C4BE3B3F38EDF5CCFA874BE84BBF4`.
- The candidate was rebuilt with the laboratory build flag explicitly disabled. Static inspection found the configured public Oracle address and no laboratory address or dormant legacy direct-database routine markers.
- Full client ZIP: 2,257,602,414 bytes, SHA-256 `E97C6601649D2CF1515C75D1FEFB888C09073E2F35DC52626DA2113E80CEB`. The Game.exe extracted from it matches the build hash.
- Launcher: Win32/x86, version 1.2.0.0, 352,768 bytes, SHA-256 `D42A393D632ED8184B217FEBB37A8C666C6C400FD8DCFA5B1CC22FD9A8C2561F`. It can bootstrap a clean client folder and update an existing client.
- Source update: launcher self-diagnostic now names the actual public TCP port 1997. Launcher source commit: `3517fde97958a432ac18e68a16a2cd1838e90dbc` on `staging/stormpt-x64`.

## Source backup

The original source snapshot from 2026-11-11 remains untouched. A synchronized dated copy on the StormPT Windows VM is at `C:\StormPT-Source-Backup\StormPT-x64-Production-Candidate-20261112`, containing 1,507 entries / 42,265,558 bytes plus a hash manifest. The synchronized copy includes the source changes used for the candidate build:
- `winmain.cpp` SHA-256: `0ACF66C057919527919E93740B967E7A00319B48FC5C673FD53DC623F5E039E3`.
- `priston.vcxproj` SHA-256: `27D021AB403F90CA14551668DE5A83398503EBB5A6550CADF1C6FC2E0F372FB0`.

## Current network plan

The public client endpoint remains the existing Oracle address `163.176.128.81`; it should not change just because the game server is moving. Oracle still relays to the existing x86 service. Do not switch its internal destination until x64 has passed controlled login, map entry, save, and reconnect checks.

## Release blockers

- The x64 server process is stopped; no real-client login against the rebuilt executable has been verified.
- The launcher accepts only RSA-signed manifests. Its matching private signing key was not found in the available operational files, so the new package and launcher have not been published to the update feed.
- The LAB website copy is staged on the StormPT VM, but the public admin/API source and database have not been recovered. The public site/admin route has not been moved.
- Existing x86 production and the public route remain untouched.

See the local/AEROCOOL operational report for detailed paths, hashes, and the ordered cutover procedure. Do not use the unsigned candidate as the public update.
