#!/bin/bash
# concat rendered segments, master the soundtrack to -14 LUFS, encode final deliverable
set -e
cd "$(dirname "$0")"
printf "file 'seg0.mp4'\nfile 'seg1.mp4'\nfile 'seg2.mp4'\nfile 'seg3.mp4'\n" > out/seg/list.txt
ffmpeg -y -loglevel error -i out/soundtrack.wav -af "loudnorm=I=-14:TP=-1.0:LRA=11" -ar 48000 out/soundtrack_master.wav
ffmpeg -y -loglevel error -f concat -safe 0 -i out/seg/list.txt -i out/soundtrack_master.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 19 -profile:v high -level 4.2 -pix_fmt yuv420p \
  -x264-params "keyint=120:min-keyint=60" -c:a aac -b:a 256k -movflags +faststart -shortest \
  -metadata title="Visual Occlusion: Why AI Fails on the Death Cap" ${1:-death_cap_ai_occlusion_9x16.mp4}
