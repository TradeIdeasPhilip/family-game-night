export {};

// I modified this from the baseline at https://github.com/TradeIdeasPhilip/deno-client-server-typescript-template
// When I copy files from the client to the server, I add ⛔ to the beginning of the file name.  Ideally we'd
// completely prevent the user from modifying the copy.  (He should modify the original.)  But at least now there
// is a big obvious warning.

const sourceDir = "../everything-else/visible-to-web/ts-shared";
const destinationDir = "shared";

function reportProblem(...info : any[]): void {
  // This task will probably be running in the background somewhere.
  // It's not clear what to do with this.
  console.log(...info);
}

function reportSuccess(sourceFileName : string, destinationFileName : string) {
  console.log(new Date().toString(), sourceFileName, "==>", destinationFileName);
}

async function refreshAll() {
  try {
    await Deno.remove(destinationDir, { recursive: true });
  } catch (ex) {
    reportProblem(destinationDir, ex);
  }
  try {
    await Deno.mkdir(destinationDir, {recursive: true});
  } catch (ex) {
    reportProblem(destinationDir, ex);
  }
  const readmeFileName = destinationDir + "/README.txt"
  try {
    await Deno.writeTextFile(readmeFileName, 
    "All files in this directory were automatically created by CopyLibraries.ts from " 
    + sourceDir 
    + ".\nDo not edit these directly.", {create: true, mode: 0o444});
    // TODO the mode is being ignored.  Maybe chmod would help, maybe not, there are issues with Deno and permissions and Windows.
  } catch (ex) {
    reportProblem(readmeFileName, ex);
  }
  try {
    for await (const dirEntry of Deno.readDir(sourceDir)) {
      const sourceFileName = sourceDir + "/" + dirEntry.name;
      if (!dirEntry.isFile) {
        // At some point it would be nice to handle subdirectories.
        reportProblem("skipping", sourceFileName, 
          dirEntry.isSymlink?"isSymlink":(dirEntry.isDirectory?"isDirectory":"unknown file type"));
      } else if (!/.ts$/.test(sourceFileName)) {
        reportProblem("skipping", "wrong file extension", sourceFileName);
      } else {
        const destinationFileName = destinationDir + "/⛔" + dirEntry.name;
        try {
          const webVersion = await Deno.readTextFile(sourceFileName);
          if (/𝒟ℯ𝓃ℴ 𝓈𝓀𝒾𝓅 ℯ𝓃𝓉𝒾𝓇ℯ 𝒻𝒾𝓁ℯ/.test(webVersion)) {
            reportProblem("skipping", "by request", sourceFileName);
          } else {
            const denoVersion = "// DO NOT EDIT.\n"
            + "// This file was automatically generated by CopyLibraries.ts from "
            + sourceFileName + ".\n\n"
            + webVersion.replaceAll(/(?<=import.*from *".*\.\/)([^/]*\.)js(?=")/g, "⛔$1ts")
            // If a line contains this string, comment out the entire line.
            // Crude but effective.
            .replaceAll(/.*𝒩ℴ𝓉 𝒻ℴ𝓇 𝒟ℯ𝓃ℴ.*/g, "// $&");
            await Deno.writeTextFile(destinationFileName, denoVersion);
            // The following line throws an exception.  I've tried different modes and that didn't help.
            // NotSupported: The operation is not supported
            //    at processResponse (deno:core/core.js:223:11)
            //    at Object.jsonOpAsync (deno:core/core.js:240:12)
            //    at async Object.chmod (deno:runtime/rt/30_fs.js:13:5)
            //    at this next line.
            //await Deno.chmod(destinationFileName, 0o444);
            reportSuccess(sourceFileName, destinationFileName);
          }
        } catch (ex) {
          reportProblem({from: sourceFileName, to: destinationFileName, ex });
        }
      }
    }
  } catch (ex) {
    reportProblem(ex);
  }
}

refreshAll();