#!/bin/bash
# One repeatable release path for both targets.
#
#   scripts/release.sh            validate, test, build, deploy web
#   scripts/release.sh --apk      also build and sign the Android release APK
#   scripts/release.sh --apk-only build only the APK from the current dist/
#   scripts/release.sh --check    validate, test, build; deploy nothing
#
# The web deploy is the build itself: the nginx container volume-mounts dist/.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT=$(pwd)
ARTIFACTS=${ARTIFACTS:-"$ROOT/../artifacts"}
KEYSTORE=${KEYSTORE:-"$ROOT/android/jyut-dojo.keystore"}
KEY_ALIAS=${KEY_ALIAS:-jyutdojo}
BUILD_TOOLS=${BUILD_TOOLS:-"$HOME/Android/Sdk/build-tools/35.0.0"}
export ANDROID_HOME=${ANDROID_HOME:-"$HOME/Android/Sdk"}

WITH_APK=0
APK_ONLY=0
DEPLOY=1
case "${1:-}" in
  --apk) WITH_APK=1 ;;
  --apk-only) WITH_APK=1; APK_ONLY=1 ;;
  --check) DEPLOY=0 ;;
  "") ;;
  *) echo "unknown flag: $1" >&2; exit 2 ;;
esac

VERSION=$(node -p "require('./package.json').version")
CONTENT_VERSION=$(node -p "require('./src/data/curriculum.json').contentVersion")
STAMP=$(date +%Y%m%d-%H%M)
say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

if [[ $APK_ONLY -eq 0 ]]; then
  say "content validation"
  npm run validate

  say "tests"
  npm test

  say "build (app $VERSION, content $CONTENT_VERSION)"
  npm run build

  if [[ $DEPLOY -eq 1 ]]; then
    say "web deploy"
    # nginx serves dist/ straight from the volume mount; a build IS the deploy.
    if docker ps --format '{{.Names}}' | grep -qx jyut-dojo; then
      echo "jyut-dojo container is up; https://jyut.benbox.dev now serves this build"
    else
      echo "WARNING: jyut-dojo container is not running — web is not being served" >&2
    fi
  fi
fi

if [[ $WITH_APK -eq 1 ]]; then
  say "android sync"
  npx cap sync android

  say "android release build"
  (cd android && ./gradlew --quiet assembleRelease)

  UNSIGNED="$ROOT/android/app/build/outputs/apk/release/app-release-unsigned.apk"
  [[ -f "$UNSIGNED" ]] || UNSIGNED="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
  ALIGNED="$ROOT/android/app/build/outputs/apk/release/app-release-aligned.apk"
  OUT="$ARTIFACTS/jyut-dojo-v$VERSION-$STAMP.apk"

  say "zipalign + sign"
  mkdir -p "$ARTIFACTS"
  rm -f "$ALIGNED"
  "$BUILD_TOOLS/zipalign" -p 4 "$UNSIGNED" "$ALIGNED"
  "$BUILD_TOOLS/apksigner" sign \
    --ks "$KEYSTORE" --ks-key-alias "$KEY_ALIAS" \
    --ks-pass "env:JYUT_KEYSTORE_PASS" --key-pass "env:JYUT_KEYSTORE_PASS" \
    --out "$OUT" "$ALIGNED"
  "$BUILD_TOOLS/apksigner" verify "$OUT"
  sha256sum "$OUT" | tee "$OUT.sha256"
  echo "APK: $OUT"
fi

say "done"
echo "app version:     $VERSION"
echo "content version: $CONTENT_VERSION"
