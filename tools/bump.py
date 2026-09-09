"""Set one version number across the whole app, in one go.

Every file the browser can cache is asked for with ?v=<number>: the two pages
ask for their stylesheet and their entry script that way, and every module asks
for the modules it imports that way too. That second half is the one that bit
us: only app.js carried a version, so a phone could load a new app.js next to a
store.js and a cloud.js from ten minutes earlier, and the two halves disagreed
in silence.

Usage:
    python tools/bump.py            # show the version everything is on
    python tools/bump.py 17         # set everything to 17
"""

import io
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

FILES = [
    "index.html",
    "helper.html",
    "sw.js",
    "js/app.js",
    "js/helper.js",
    "js/store.js",
    "js/cloud.js",
    "js/camera.js",
    "js/ocr.js",
    "js/speech.js",
    "js/install.js",
    "js/lock.js",
    "js/config.js",
    "js/i18n.js",
    "js/docs.js",
    "js/voices.js",
    "privacy.html",
]

VERSION_QUERY = re.compile(r"\?v=(\d+)")
SW_VERSION = re.compile(r"const VERSION = (\d+);")


def read(name):
    with io.open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()


def write(name, text):
    with io.open(os.path.join(HERE, name), "w", encoding="utf-8") as f:
        f.write(text)


def versions():
    found = {}
    for name in FILES:
        text = read(name)
        numbers = sorted(set(VERSION_QUERY.findall(text)))
        cache = SW_VERSION.findall(text)
        if numbers or cache:
            found[name] = {"query": numbers, "cache": cache}
    return found


def bump(target):
    for name in FILES:
        text = read(name)
        new = VERSION_QUERY.sub("?v=" + str(target), text)
        new = SW_VERSION.sub("const VERSION = %d;" % target, new)
        if new != text:
            write(name, new)
            print("set", name)


if len(sys.argv) == 1:
    for name, info in versions().items():
        print(name, info)
else:
    bump(int(sys.argv[1]))
    print("\nnow:")
    for name, info in versions().items():
        print(" ", name, info)
