# Build from source

This page contains documentation on how to build Solar from source. While Solar itself is still under active development this section will evolve to cover the full build process in detail as the project approaches release.


## Not now, but what? 

At the moment Solar’s core browser build is still in progress. Current development is focused on its JavaScript engine Quanta. If you want to build and experiment with Solar’s foundation today you can start by building Quanta instead.

Quanta is Solar’s JavaScript engine and lives in its own repository:  
[Star it right here!](https://github.com/solarbrowser/quanta)

### Building Quanta

Quanta uses platform native compilers to ensure predictable performance and clean builds.

**Universal Build Script (Recommended):**

```bash
./build.sh           # Build with Makefile
./build.sh cmake     # Build with CMake
./build.sh clean     # Clean all builds
```

**Windows (Native MSVC):**

```bash
build-windows.bat    # MSVC
```

Requires: Visual Studio 2019/2022 + CMake

**Linux/macOS:**

```bash
make -j$(nproc)      # Makefile build
# or
./build.sh cmake     # CMake build
```

### Build System Options

**CMake (Cross-platform, native compilers)**

- Windows: MSVC with `/O2 /GL /LTCG` optimizations
- Linux: GCC with `-O3 -march=native`
- macOS: Clang with native optimizations

**Makefile (GCC/MinGW)**

- Traditional make-based build
- Works on all platforms with GCC


