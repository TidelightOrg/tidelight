# Official package publication runbook

Checked on 2026-10-18. Registry lookups returned 404 for the four npm package names and for the PyPI project named tidelight. A 404 means no public project was returned by that lookup; it does not establish namespace ownership or reserve a name.

No registry package has been published. The source package manifests remain private. Do not run the publishing workflow until the manual account, ownership, and release checks below are complete.

## Package names and release state

| Registry | Name | Source path | Source license |
| --- | --- | --- | --- |
| npm | @tidelight/sdk | sdk/typescript | Apache-2.0 |
| npm | @tidelight/mcp | public/components/mcp/server | Apache-2.0 |
| npm | @tidelight/react | packages/react | Apache-2.0 |
| npm | @tidelight/cli | packages/cli | Apache-2.0 |
| PyPI | tidelight | sdk/python | Apache-2.0 |

These licenses cover only each package distribution. The mother repository does not have a root license grant. Its proprietary application, API implementation, research engines, provider integrations, operational code, credentials, and commercial infrastructure are outside this package license.

## What is prepared

- Each public package source directory contains the complete Apache License 2.0 text and a package-scoped NOTICE file.
- npm manifests declare SPDX license Apache-2.0 and include LICENSE and NOTICE in the files allowlist. They stay private in the source tree.
- The Python project metadata uses the tidelight distribution name, SPDX Apache-2.0, and includes its license files in the wheel metadata.
- Source code review found purpose-built Tidelight package code and no vendored third-party implementation in the package directories. Third-party dependencies remain separately licensed and are not re-licensed by the package NOTICE.
- npm package release staging removes source-only private and development metadata. It maps the CLI’s internal file dependency to the matching published SDK semver. Mother repository source manifests continue to use the local SDK path for development and tests.
- The manual candidate workflow builds packages and checks exact archives. The separate publishing workflow requires the explicit publication phrase and approval of the protected registry environments. It publishes the already-built candidate artifact, not a rebuilt tree.
- The UI never shows registry installation commands as available before release.

The direct npm runtime dependencies inspected are the MCP SDK, Zod, and the Node keyring module; their own registry licenses remain in force. Python runtime code uses the standard library. Re-run the automated dependency license and vulnerability audit on the locked full dependency trees immediately before the first publication. Do not vendor or bundle dependency source without adding its required notices.

## Manual setup you must complete

These are owner-account actions. Do them in the organization’s registry accounts; do not paste tokens or passwords into chat.

### 1. Confirm package rights and the Apache grant

1. Review the five package source directories and verify that Tidelight owns the code or has written rights to license it under Apache-2.0.
2. Confirm that no copied code, design asset, generated SDK, or contributor contribution is missing an attribution or license obligation.
3. Review package-scoped LICENSE and NOTICE files. They grant Apache-2.0 only to the contents of that one package distribution and make no grant over Tidelight names or marks.
4. Keep third-party dependencies under their original licenses. If any dependency is later bundled into an archive, add the notices required by that dependency before release.
5. Ask counsel or the organization’s license reviewer if the package ownership records or contributor grants are incomplete.

Do not add a root LICENSE to the mother repository. It would be read as applying to proprietary paths that are intentionally excluded.

### 2. Claim and secure the npm scope

1. Sign in to the organization’s npm account at npmjs.com. Use an organization owner account and enforce two-factor authentication.
2. Open the npm organization settings and verify that the organization owns the @tidelight scope. The package-name 404 results do not claim the scope.
3. Confirm that the organization can create and maintain all four names: @tidelight/sdk, @tidelight/mcp, @tidelight/react, and @tidelight/cli. Do not silently substitute another scope.
4. Add only the release maintainers who need publish access. Confirm package owner access after the first approved release.
5. After the publishing workflow is present on the protected main branch, open each package’s npm settings and add a Trusted Publisher:
   - Owner: TidelightOrg
   - Repository: tidelight
   - Workflow: publish-packages.yml
   - GitHub environment: npm-publish
6. Repeat that exact publisher relationship for all four npm package names. Require a reviewer for the GitHub npm-publish environment and restrict publishing to the main branch and an approved release window.
7. Do not add an npm token to GitHub Actions. The publishing job uses GitHub OIDC and npm provenance. If npm requires a one-time first-package creation step before it exposes Trusted Publisher settings, stop and follow npm’s current first-publish flow using an owner-controlled, package-scoped credential. Never send that credential in chat; revoke it immediately after trusted publishing is active.

### 3. Claim and secure the PyPI project

1. Sign in to the organization-controlled PyPI account and confirm that Tidelight is authorized to claim the tidelight project name. The 404 lookup is not a reservation.
2. Add the organization’s release maintainers and require strong account security.
3. After the publishing workflow is present on the protected main branch, open PyPI’s project publishing settings and add a pending Trusted Publisher:
   - Owner: TidelightOrg
   - Repository: tidelight
   - Workflow: publish-packages.yml
   - Environment: pypi-publish
4. Configure the GitHub pypi-publish environment with a required owner review. The PyPI job uses OIDC; do not create or store a PyPI API token in GitHub Actions.
5. If PyPI shows that tidelight has already been claimed, stop and do not upload. Resolve ownership or choose a new public name only after an explicit product decision.

### 4. Configure GitHub release controls

1. Protect main and require the repository checks to pass before merging.
2. In Settings → Environments, create npm-publish and pypi-publish. Add required reviewers from the package-owning organization.
3. Restrict both environments to the protected main branch. Keep registry publishing permission out of tests and candidate builds.
4. Confirm the GitHub Actions workflow identity exactly matches the registry Trusted Publisher settings, including the file name and environment.
5. Do not create long-lived registry secrets. The workflow only gets id-token: write in the publication jobs after the protected environment approval.

### 5. First release checklist

Before running the workflow:

- Confirm namespace ownership in npm and PyPI.
- Review the staged candidate artifacts and checksums.
- Confirm the required scopes, API behavior, data-provider redistribution terms, package security contact, and compatibility table.
- Confirm all five source versions match the version you intend to publish.
- Confirm the staged CLI manifest references the published @tidelight/sdk version, not a file path.
- Confirm the source and package mirrors are synchronized to the same mother repository commit.
- Verify the manual GitHub source release is not being mistaken for npm/PyPI publication.
- Obtain a final release approval from a Tidelight organization owner.

Then, from GitHub Actions on main:

1. Select Publish official packages.
2. Enter the exact version that appears in all five package manifests.
3. Enter PUBLISH OFFICIAL PACKAGES in the confirmation field.
4. Review the candidate test/build job and its checksum manifest.
5. Approve the npm-publish environment when the SDK, MCP, React, and CLI job pauses for review.
6. Approve the pypi-publish environment when the Python job pauses for review.
7. Verify each registry package from a clean environment using the commands below. A green workflow alone is not proof that the published tarball installs correctly.

## Clean consumer checks after publication

Use a fresh temporary directory and the exact version from the approved release.

~~~sh
npm view @tidelight/sdk@VERSION version license dist.tarball
npm pack @tidelight/sdk@VERSION
npm install @tidelight/sdk@VERSION
~~~

Repeat for @tidelight/mcp, @tidelight/react, and @tidelight/cli. Import or invoke each public entry point in a clean Node.js 22 environment. For CLI, verify the SDK dependency resolves from npm and that the executable starts without source-tree paths.

For Python:

~~~sh
python -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install tidelight==VERSION
python -c "from tidelight import ApiError, Client; print('Tidelight SDK import passed')"
~~~

Check the PyPI project links, license expression, wheel LICENSE/NOTICE metadata, and artifact digest. Record the source commit, workflow run, npm provenance/PyPI publisher result, SHA-256, and clean-install test in the release notes.

## Rollback and corrections

Never overwrite an npm version. For a defective release, deprecate the affected version with a clear message, publish a corrected SemVer version, and document a migration. Follow PyPI’s project policy for yanking a defective release; do not delete a release that users may already depend on. Revoke the compromised publisher relationship and rotate organization access if a publishing credential is exposed.
