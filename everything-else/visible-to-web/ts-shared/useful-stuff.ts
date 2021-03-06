// https://stackoverflow.com/a/39914235/971955
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * This creates a new url based on an absolute url and a path relative to that url.
 * This converts `http://` to `ws://` and converts `https://` to `wss://`.
 *
 * The built in tools will only let you merge a two urls if all the urls have the exact same protocol, domain and port.
 *
 * Use case:  We expect to serve http and ws on the same server.
 * That server might often change location, especially between debugging and production.
 * We use SSL for both types of requests or for neither.
 * @param relativeWsUrl A string like '/streaming/crazy-eights' or '../streaming/crazy-eights?id=5' 'streaming/crazy-eights?new'
 * This should __not__ include a protocol, domain, or port; those will all be copied from absoluteHttpUrl.
 * This should include a path and an optional query string.
 * @param absoluteHttpUrl An absolute URL with `http` or `https` as the protocol.
 * If you are running on the client this will typically be `location.toString()`;
 * @returns A new url.
 */
export function makeWebSocketUrl(
  relativeWsUrl: string,
  absoluteHttpUrl: string
): string {
  return new URL(relativeWsUrl, absoluteHttpUrl)
    .toString()
    .replace(/^http/, "ws");
}

export function pickOneRandomly<T>(array : ReadonlyArray<T>) : T {
  const length = array.length;
  if (length == 0) {
    throw new Error("Array is empty.");
  }
  const index = (Math.random()*length) |0;
  return array[index];
}

let libraryContext = "Deno server 🦕";
// The following line will be commented out when we copy to the Deno server.
libraryContext = "Web client 🕸"; // 𝒩ℴ𝓉 𝒻ℴ𝓇 𝒟ℯ𝓃ℴ
console.log("LIBRARY CONTEXT:", libraryContext);
