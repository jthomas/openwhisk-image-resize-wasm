# Apache OpenWhisk Image Resizing with WebAssembly

This repository contains a serverless function (for Apache OpenWhisk) to resize images using a C library called via WebAssembly. It is a fork of [original code](https://github.com/cloudflare/cloudflare-workers-wasm-demo) created by Cloudflare for their Workers platform. See the original repository for details on what the repository contains and how the files work. 

## Usage

- Create deployment package from source files.

```
zip action.zip resizer.wasm package.json worker.js
```

- Create Apache OpenWhisk action from deployment package.

```
ibmcloud wsk action update resizer action.zip --kind nodejs:10 --web true
```

- Retrieve HTTP URL for Web Action.

```
ibmcloud wsk action get resizer --url
ok: got action resizer
https://<region>.cloud.ibm.com/api/v1/web/<ns>/default/resizer <-- USE THIS URL
```

- Open the HTTP URL with the `.http` extension.

```
https://<region>.cloud.ibm.com/api/v1/web/<ns>/default/resizer.http
```

This should return the following image resized to 250 pixels (from 900 pixels). 

![Pug with Ice-cream](https://bit.ly/2ZlP838)

URL query parameters (`url` and `width`) can be used to modify the image source or output width for the next image, e.g. 

```
https://<region>.cloud.ibm.com/api/v1/web/<ns>/default/resizer.http?url=<IMG_URL>&width=500
```

## How to re-build WASM file (OS X)

- Install LLVM.

```
brew install llvm
brew link --force llvm
```

- Remove existing WASM file (`resize.wasm`)

````
make clean
````

- Run build command (which uses `clang`).

```
make build
```