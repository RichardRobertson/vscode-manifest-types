# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Public API documentation
- Configuration section, key, and full key constants

### Changed

- Cleanup command JSDoc gen
- Cleanup configuration JSDoc gen
- Rename configuration type gen from `KeyType` to just `Key`

### Fixed

- `ICommand` won't have pre-localized strings in `package.json`. Was from a misunderstanding of the way VSCode source code handled `package.json`.

## [0.1.0] - 2026/04/06

- Initial release
