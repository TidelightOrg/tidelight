const status = document.getElementById("status");
const video = document.getElementById("recording");

async function loadRecording() {
  try {
    const response = await fetch("./tidelight-npm-python-install-usage-20261024.mp4.b64");
    if (!response.ok) throw new Error("Recording data could not be loaded (" + response.status + ").");
    const encoded = (await response.text()).trim();
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    video.src = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
    video.addEventListener("loadedmetadata", () => {
      status.textContent = "Recording ready. This is the separate npm and Python install-and-usage capture.";
    }, { once: true });
    video.addEventListener("error", () => {
      status.textContent = "The recorded file loaded, but this browser could not decode the MP4.";
    }, { once: true });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "The recording could not be loaded.";
  }
}

loadRecording();
