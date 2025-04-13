# music-linker

tiny script that takes an input directory of music files and creates an output directory of hard links to those music files, under the following structure:

`<dest>/[artist]/[album]/[track]. [title].[extension]`

e.g. `/music/The Flaming Lips/Yoshimi Battles The Pink Robots/1. Fight Test.flac`

usage:

`music-linker.mjs <src> <dest>`

this is useful when you want to sort an existing library of music without changing the existing directory structure.

hard links are used so that if the original file is deleted, you'll still be able to access the file.

to use, clone this repo then run `node music-linker.mjs` - this should also work in deno/bun without any modifications

it accepts two arguments, `src` folder containing your music and `dest` folder where the program will create the links

this program requires `ffprobe` from `ffmpeg` to be installed on your machine

the script is tiny, has no dependencies besides `ffprobe` and should be very easy to edit for your use case if needs be (e.g. replacing `fsp.link` with `fsp.symlink`)
