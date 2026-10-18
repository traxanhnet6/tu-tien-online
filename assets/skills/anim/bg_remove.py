#!/usr/bin/env python3
"""Flood-fill nền đen từ 4 viền -> trong suốt, resize 512x512 NEAREST."""
import sys, os
from PIL import Image
from collections import deque

THRESH = 48  # pixel được coi là 'đen' nếu max RGB < THRESH

def make_transparent(path, out_size=512):
    img = Image.open(path).convert('RGBA')
    px = img.load()
    w, h = img.size
    visited = [[False]*w for _ in range(h)]
    q = deque()
    # seed từ 4 viền
    for x in range(w):
        q.append((x, 0)); q.append((x, h-1))
    for y in range(h):
        q.append((0, y)); q.append((w-1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        if max(r, g, b) < THRESH:
            px[x, y] = (0, 0, 0, 0)
            q.append((x+1, y)); q.append((x-1, y))
            q.append((x, y+1)); q.append((x, y-1))
    img = img.resize((out_size, out_size), Image.NEAREST)
    img.save(path)
    print(f"OK {os.path.basename(path)} {img.size}")

if __name__ == '__main__':
    for p in sys.argv[1:]:
        make_transparent(p)
