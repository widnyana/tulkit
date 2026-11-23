#!/usr/bin/env node
// Release driver for pushes to main: bump package.json, prepend CHANGELOG.md,
// commit, tag, push, and publish a GitHub release. No release PR.
//
// Zero-tag history bootstraps instead of bumping: the current package.json
// version gets tagged, pushed, and released as "Initial release".
// `node scripts/release.mjs --dry-run` prints without mutating anything.
// RELEASE_LAST_TAG overrides the tag/commit-ish used as the changelog base
// (testing aid; normally discovered with `git describe`).

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_PATH = join(ROOT, "package.json");
const CHANGELOG_PATH = join(ROOT, "CHANGELOG.md");

const BOT_NAME = "github-actions[bot]";
const BOT_EMAIL = "41898282+github-actions[bot]@users.noreply.github.com";

const RELEASE_SUBJECT = /^chore\(release\):/;
const BREAKING_SUBJECT = /^[a-z]+(\(.+\))?!:/;
const FEATURE_SUBJECT = /^feat(\(.+\))?!?:/;
const FIX_SUBJECT = /^fix(\(.+\))?!?:/;

const dryRun = process.argv.includes("--dry-run");

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    if (allowFailure) return null;
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`git ${args.join(" ")} failed${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}`);
  }
}

function readPackage() {
  return JSON.parse(readFileSync(PACKAGE_PATH, "utf8"));
}

function bumpVersion(version, level) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) throw new Error(`cannot bump non-semver version ${JSON.stringify(version)}`);
  let [major, minor, patch] = match.slice(1).map(Number);
  if (level === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (level === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function collectCommits(range) {
  const raw = git(["log", range, "--format=%H%x1f%s%x1f%b%x1e"]);
  return raw
    .split("\x1e")
    .map((chunk) => chunk.replace(/^\n+/, ""))
    .filter((chunk) => chunk.trim() !== "")
    .map((chunk) => {
      const [hash, subject, ...rest] = chunk.split("\x1f");
      return { hash, subject: subject.trim(), body: rest.join("\x1f") };
    })
    .filter(({ subject }) => !RELEASE_SUBJECT.test(subject));
}

function classify(commits) {
  const breaking = commits.some(
    ({ subject, body }) => BREAKING_SUBJECT.test(subject) || body.includes("BREAKING CHANGE"),
  );
  const level = breaking
    ? "major"
    : commits.some(({ subject }) => FEATURE_SUBJECT.test(subject))
      ? "minor"
      : "patch";

  const groups = [
    {
      title: "Features",
      items: commits.filter(({ subject }) => FEATURE_SUBJECT.test(subject)),
    },
    {
      title: "Bug Fixes",
      items: commits.filter(({ subject }) => FIX_SUBJECT.test(subject)),
    },
    {
      title: "Other",
      items: commits.filter(
        ({ subject }) => !FEATURE_SUBJECT.test(subject) && !FIX_SUBJECT.test(subject),
      ),
    },
  ].filter(({ items }) => items.length > 0);

  return { level, groups };
}

function formatSection(version, date, groups) {
  const lines = [`## [${version}] - ${date}`, ""];
  for (const { title, items } of groups) {
    lines.push(`### ${title}`, "");
    for (const { hash, subject } of items) {
      lines.push(`- ${hash.slice(0, 7)} ${subject}`);
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function prependChangelog(section) {
  const existing = existsSync(CHANGELOG_PATH)
    ? readFileSync(CHANGELOG_PATH, "utf8")
    : "";
  const body = existing.replace(/^# Changelog\s*\n+/, "").replace(/^\n+/, "");
  const content = body
    ? `# Changelog\n\n${section}\n${body}`
    : `# Changelog\n\n${section}`;
  writeFileSync(CHANGELOG_PATH, content);
}

function writePackageVersion(version) {
  const source = readFileSync(PACKAGE_PATH, "utf8");
  const updated = source.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`);
  if (updated === source) throw new Error("could not locate version field in package.json");
  writeFileSync(PACKAGE_PATH, updated);
}

function createRelease(tagName, { notes = null, notesFile = null } = {}) {
  if (notesFile) {
    run("gh", ["release", "create", tagName, "--title", tagName, "--notes-file", notesFile]);
    return;
  }
  run("gh", ["release", "create", tagName, "--title", tagName, "--notes", notes]);
}

function commitNoun(count) {
  return count === 1 ? "commit" : "commits";
}

function summary({ version, commitCount, tagName, dry }) {
  const mode = dry ? "dry run" : "released";
  return `${mode} v${version} · ${commitCount} ${commitNoun(commitCount)} · tags pushed: ${tagName}`;
}

function lastTag() {
  const override = process.env.RELEASE_LAST_TAG;
  if (override) return override;
  const tag = git(
    ["describe", "--tags", "--abbrev=0", "--match", "v*"],
    { allowFailure: true },
  );
  return tag ? tag.trim() : null;
}

function configureIdentity() {
  git(["config", "user.name", process.env.GITHUB_ACTOR || BOT_NAME]);
  git([
    "config",
    "user.email",
    process.env.GITHUB_ACTOR_ID
      ? `${process.env.GITHUB_ACTOR_ID}+${process.env.GITHUB_ACTOR}@users.noreply.github.com`
      : BOT_EMAIL,
  ]);
}

function versionCommit() {
  const { version } = readPackage();
  const found = git(
    [
      "log",
      "-S",
      `"version": "${version}"`,
      "--format=%H",
      "--reverse",
      "--",
      "package.json",
    ],
    { allowFailure: true },
  ).trim();
  const first = found.split("\n").filter(Boolean)[0];
  return first ?? null;
}

function main() {
  const headSubject = git(["log", "-1", "--format=%s"]).trim();
  if (RELEASE_SUBJECT.test(headSubject)) {
    console.log("already a release commit");
    return;
  }

  configureIdentity();

  const tag = lastTag();
  const base =
    tag ??
    versionCommit() ??
    git(["rev-list", "--max-parents=0", "HEAD"])
      .trim()
      .split("\n")
      .pop();

  const baseLabel = tag ?? `v${readPackage().version} (version commit)`;
  const commits = collectCommits(`${base}..HEAD`);
  if (commits.length === 0) {
    console.log("nothing to release");
    return;
  }

  const { level, groups } = classify(commits);
  const { version: current } = readPackage();
  const version = bumpVersion(current, level);
  const tagName = `v${version}`;
  const section = formatSection(version, new Date().toISOString().slice(0, 10), groups);

  if (dryRun) {
    console.log(
      `base ${baseLabel} · ${commits.length} ${commitNoun(commits.length)} · bump ${current} -> ${version} (${level})`,
    );
    process.stdout.write(section);
    console.log(summary({ version, commitCount: commits.length, tagName, dry: true }));
    return;
  }

  writePackageVersion(version);
  prependChangelog(section);

  git(["add", "package.json", "CHANGELOG.md"]);
  git(["commit", "-m", `chore(release): v${version}`]);
  git(["tag", "-a", tagName, "-m", tagName]);
  git(["push", "origin", "HEAD:main", "--follow-tags"]);

  const notesDir = mkdtempSync(join(tmpdir(), "tulkit-release-"));
  try {
    const notesFile = join(notesDir, "notes.md");
    writeFileSync(notesFile, section);
    createRelease(tagName, { notesFile });
  } finally {
    rmSync(notesDir, { recursive: true, force: true });
  }

  console.log(summary({ version, commitCount: commits.length, tagName, dry: false }));
}

main();
