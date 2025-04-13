#!/usr/bin/env node
/** @format */

import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import cproc from "node:child_process"

const DIRNAME_NO_ARTIST = "Unidentified Artist"

const run = (command) => {
	return new Promise((resolve, reject) => {
		const spawned = cproc.spawn(command, {shell: true})
		spawned.on("error", () => {
			reject(new Error("failed to create process"))
		})
		let stdout = ""
		spawned.stdout.on("data", (chunk) => {
			stdout += chunk
		})
		spawned.on("exit", (code) => {
			if (code === 0) {
				resolve(stdout)
			} else {
				reject(new Error("exited with code: " + code))
			}
		})
		spawned.stderr.on("data", (chunk) => {
			console.error("[stderr]", chunk)
		})
	})
}

const find = async (trueRoot, extensions) => {
	const found = []
	const walk = async (root) => {
		const filesHere = await fsp.readdir(root)
		for (const file of filesHere) {
			const fullPath = path.join(root, file)
			const stat = await fsp.stat(fullPath)
			if (stat.isDirectory()) {
				await walk(fullPath)
			} else {
				const ext = path.extname(fullPath)
				if (extensions.includes(ext)) {
					found.push(fullPath)
				}
			}
		}
	}
	await walk(trueRoot)
	return found
}

const [src, dest] = process.argv.slice(2)

if (!src || !dest) {
	console.error("Usage: [script] <src-folder> <dest-folder>")
	process.exit(1)
}

const found = await find(src, [".mp3", ".wav", ".flac", ".m4a"])

let n = 0
for (const originalFilePath of found) {
	const cmd = `ffprobe -v quiet -print_format json -show_format "${originalFilePath}"`
	const ffprobe = JSON.parse(await run(cmd))

	let artist =
		ffprobe.format.tags.album_artist ??
		ffprobe.format.tags.ALBUM_ARTIST ??
		ffprobe.format.tags.AlbumArtist ??
		//
		ffprobe.format.tags.artist ??
		ffprobe.format.tags.ARTIST ??
		ffprobe.format.tags.Artist

	let album = ffprobe.format.tags.album ?? ffprobe.format.tags.ALBUM ?? ffprobe.format.tags.Album
	let track = ffprobe.format.tags.track ?? ffprobe.format.tags.TRACK
	let title = ffprobe.format.tags.title ?? ffprobe.format.tags.TITLE ?? ffprobe.format.tags.Title

	const ext = path.extname(originalFilePath)

	if (!artist) {
		artist = DIRNAME_NO_ARTIST
		console.error(originalFilePath, "-", "could not find artist name")
	}

	if (!track) {
		console.error("[SKIPPED !] did not find track on:", ffprobe)
		continue
	}

	// if the track is like /12 then just use the 4 part
	if (track.includes("/")) {
		track = track.split("/")[0]
	}

	if (Number.isNaN(+track)) {
		console.error(originalFilePath, "-", "track # (" + track + ") may not be valid")
		// console.error("track here looks invalid!")
		// console.error({dest, artist, album, track, title, ext})
		// console.error(ffprobe)
	}

	if (!title) {
		console.error(originalFilePath, "-", "could not find song title")
		title = path.basename(originalFilePath, ext)
	}

	if (!album) {
		if (title) {
			console.warn(originalFilePath, "-", "no album found, so treating as a Single")
			track = "" // don't set a track
			album = "" // don't set an album
		} else {
			console.error("[SKIPPED !] did not find album on:", ffprobe)
			continue
		}
	}

	// replace slashes in titles with full-width slashes so they don't mess with the file path
	title = title.replaceAll("/", "／")

	const outPath = path.join(dest, artist, album, (track ? track + ". " + title : title) + ext)
	await fsp.mkdir(path.resolve(outPath, ".."), {recursive: true})
	if (fs.existsSync(outPath)) {
		console.error(
			outPath,
			"is already linked.",
			"Not adding:",
			originalFilePath,
			"-- you likely have duplicate music, or have already ran against this path"
		)
		continue
	}

	await fsp.link(originalFilePath, outPath)
	n++
	if (n % 10 === 0) {
		console.log(n, "/", found.length, "(" + ((n / found.length) * 100).toFixed(1) + "%)")
	}
}
console.log("complete!")
