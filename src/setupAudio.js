import PitchNode from "./PitchNode";

async function getWebAudioMediaStream() {
	if (!window.navigator.mediaDevices) {
		throw new Error(
			"This browser does not support web audio or it is not enabled"
		)
	}

	try {
		const result = await window.navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false,
		})

		return result;
	} catch (err) {
		switch (err.name) {
			case "NotAllowedError":
				throw new Error(
					"A recording device was found but has been disabled for this application. Enable the device in the browser settings"
				);

			case "NotFoundError":
				throw new Error(
					"No recording device was found. Please attach a microphone and click retry."
				);

			default:
				throw err
		}
	}
}

export async function setupAudio(onPitchDetectedCallback) {
	const mediaStream = await getWebAudioMediaStream();

	const context = new window.AudioContext();
	const audioSource = context.createMediaStreamSource(mediaStream);

	let node;

	try {
		// Fetch the WASM module that handles pitch detection
		const response = await window.fetch("wasm-audio/wasm_audio_bg.wasm");
		const wasmBytes = await response.arrayBuffer();

		// Add audio processor worklet to the context.
		const processorUrl = "PitchProcessor.js"
		try {
			await context.audioWorklet.addModule(processorUrl);
		} catch (err) {
			throw new Error(
				`Failed to load audio analyzer worklet at ${processorUrl}. Further info: ${err.message}`
			);
		}

		// Create the AudioWorkletNode which enables the main JavaScript thread to
		// communicate with the audio processor (which runs in a Worklet).
		node = new PitchNode(context, "PitchProcessor");

		// numAudioSamplesPerAnalysis specifies the number of consecutive audio samples that
		// the pitch detection algorithm calculates for each unit of work. Larger values tend
		// to produce slightly more accurate results but are more expensive to compute and
		// can lead to notes being missed in faster passages i.e. where the music note is
		// changing rapidly. 1024 is usually a good balance between efficiency and accuracy
		// for music analysis.
		const numAudioSamplesPerAnalysis = 1024;

		// Send the Wasm module to the audio node which in turn passes it to the
		// processor running in the Worklet thread. Also, pass any configuration
		// parameters for the Wasm detection algorithm.
		node.init(wasmBytes, onPitchDetectedCallback, numAudioSamplesPerAnalysis);

		// Connect the audio source (microphone output) to our analysis node.
		audioSource.connect(node);

		node.connect(context.destination)
	} catch (err) {
		throw new Error(
			`Failed to load audio analyzer WASM module. Further info: ${err.message}`
		)
	}

	return { context, node };
}
