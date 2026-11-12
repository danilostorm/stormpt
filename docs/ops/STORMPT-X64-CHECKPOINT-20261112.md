# StormPT x64 client/launcher staging checkpoint — 2026-11-12

## Current launcher/feed validation — 2026-11-12

- The v10 signature-format failure is now understood: its verifier accepts raw RSA bytes only, while the prior manifest signature was Base64 text. Launcher v11 accepts either representation. Source commit 6b3627b has been pushed to GitHub branch staging/stormpt-x64; no public release was made.
- Private staging IIS on the SuperFrame StormPT VM now serves the v11 manifest, 384-byte raw signature, and 355,328-byte v11 launcher. Manifest SHA-256 f9f3ca2e76427e4da05383376172dab09989b6ef02ba5a9eb15a9e8342134613; signature SHA-256 d695bb989791a7eb156de4b9147b66a3e4b72d037393781291a242acb2d5914f; launcher SHA-256 75f796cbdb700f007e927487b6b457c11c47c4e61af014f3b350a32e3874ce3b. Backup is outside the served root at C:/StormPTSiteStaging/20261111/backup-feed-20261112-v3.
- v10 and v11 verifiers both accepted the active raw signature. v10 validated the patch; v11 validated the HTTP range endpoint. A staging v10 executable auto-updated itself to v11. Clean install and incremental client patch both succeeded in a temporary local test directory; 32,720 files were extracted and the final Game.exe hash matched. No Game.exe was launched.
- NEXUS verified HTTP 200 and exact hashes for the manifest, signature, and launcher through the IIS binding at 100.101.156.69:3825 with Host stormpt.hoststorm.cloud. An earlier post-activation check used localhost and failed because it did not match the explicit IIS binding; the correct route was then verified and the installer script was corrected.
- No public feed, production x86 service, Oracle/relay, public website/admin, or game-server route changed. x64 gameplay/login/save are not homologated. Do not access the VM Ziel.
- The temporary hosts override was removed and its file hash matches the pre-test backup. The transfer process and port 18785 are stopped. Recursive deletion of D:/StormPT-Launcher-Install-Test-20261112 was blocked by automatic review; there are no processes under that path. The transfer helper's small __pycache__ file also remains because automatic review blocked deletion.

Detailed evidence: docs/StormPT-X64-Launcher-Site-Staging-20261112.md and docs/ops/StormPT-Manifest-Signing-Key-Rotation-20261111.md. The local operational report is outputs/StormPT-X64-Launcher-Site-Staging-20261112.md.

## Historical signing-key/feed baseline — 2026-11-11

- No previous manifest private key was found in the accessible Games VM on AEROCOOL. The Games VM on Ziel is running, but its QEMU guest agent does not respond, so that guest disk remains uninspected; do not infer the old key is absent there.
- A new RSA-3072 key is prepared for staging only. Public key ID: `35194eb33fd86b739cb5419ee7d7fb88e5c80e1b8553e1f9b6d3e0a581579608`. The DPAPI `CurrentUser` encrypted private blob is stored only on the NEXUS at `C:\Users\Administrator\Documents\StormPT-Secrets\ManifestSigner\` and an identical encrypted local copy at `E:\StormPT-Secrets\ManifestSigner\`; do not upload either private blob.
- The launcher verifier now accepts both the new key and the previous manifest public key during transition. The staging IIS feed was read without changes at `100.101.156.69:3825` (Host `stormpt.hoststorm.cloud`); its current signature verifies with the previous key, not the new key. The production domain `/client-files/manifest.json` currently returns 404.
- Launcher build SHA-256 after the fallback change: `8AB096528D66D7B45EA81F0BC7E14DE1A496C325F65B51449CA59B81E48D5271`. Compilation succeeded with the existing CS0649 warning. Source commits: key `da47b875e159cfbf908c304dae473b027263834b`, compatibility `0a70414`.
- The feed has not been changed. The existing signed legacy-updater manifest is valid, but its launcher entry points to the older 33,280-byte helper; replacing that entry or publishing a new manifest still requires a verified distribution path. The previous private signing key was not recovered, and the full upgrade chain has not been proven. No production, Oracle relay, website route, or public feed changed.
- The local operational report `outputs/StormPT-Manifest-Signing-Key-Rotation-20261111.md` contains the evidence and recovery procedure. DPAPI backup is tied to the current NEXUS Windows profile, not disaster recovery to a different PC.

This is a staging-only checkpoint. No production cutover was performed.

## Historical candidate artifacts and blockers before v11 validation

- Game.exe: AMD64, 8,748,544 bytes, SHA-256 `74782F10B7C9752E9BBCBFB41BD46C584E5C4BE3B3F38EDF5CCFA874BE84BBF4`.
- The candidate was rebuilt with the laboratory build flag explicitly disabled. Static inspection found the configured public Oracle address and no laboratory address or dormant legacy direct-database routine markers.
- Full client ZIP: 2,257,602,414 bytes, SHA-256 `E97C6601649D2CF1515C75D1FEFB888C09073E2F35DC52626DA2113E80CEB`. The Game.exe extracted from it matches the build hash.
- Launcher: Win32/x86, version 1.2.0.0, 352,768 bytes, SHA-256 `2911811A4FD7E1464E64B3186EFD5DAB7FF775E8710C5CCB93959EE1C7DB5264`. It can bootstrap a clean client folder and update an existing client.
- Source updates: launcher self-diagnostic names public TCP port 1997; the staging launcher pins the new manifest public key. Latest source commit: `da47b875e159cfbf908c304dae473b027263834b` on `staging/stormpt-x64`.

## Source backup

The original source snapshot from 2026-11-11 remains untouched. A synchronized dated copy on the StormPT Windows VM is at `C:\StormPT-Source-Backup\StormPT-x64-Production-Candidate-20261112`, containing 1,507 entries / 42,265,558 bytes plus a hash manifest. The synchronized copy includes the source changes used for the candidate build:
- `winmain.cpp` SHA-256: `0ACF66C057919527919E93740B967E7A00319B48FC5C673FD53DC623F5E039E3`.
- `priston.vcxproj` SHA-256: `27D021AB403F90CA14551668DE5A83398503EBB5A6550CADF1C6FC2E0F372FB0`.

## Current network plan

The public client endpoint remains the existing Oracle address `163.176.128.81`; it should not change just because the game server is moving. Oracle still relays to the existing x86 service. Do not switch its internal destination until x64 has passed controlled login, map entry, save, and reconnect checks.

## Release blockers

- The x64 server process is stopped; no real-client login against the rebuilt executable has been verified.
- The launcher accepts only RSA-signed manifests. The previous private signing key was not found in accessible locations; Ziel Games remains uninspected because its guest agent is unavailable. A new key is held locally for staging, but the existing launchers' transition to it is unverified. The new package and launcher have not been published to the update feed.
- The LAB website copy is staged on the StormPT VM, but searches of the GitHub repository and Drive did not locate the public admin/API source or database. The public site/admin route has not been moved.
- Existing x86 production and the public route remain untouched.

See the local/AEROCOOL operational report for detailed paths, hashes, and the ordered cutover procedure. Do not use the unsigned candidate as the public update.
