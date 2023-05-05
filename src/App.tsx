import { useState } from 'react';
import './App.css';
import { setupAudio } from './setupAudio';
import PitchNode from './PitchNode';

function PitchReadout({ running, latestPitch }: { running: boolean | undefined, latestPitch: Number | undefined }) {
  return (
    <div className='Pitch-readout'>
      {latestPitch
        ? `Latest pitch ${latestPitch.toFixed(1)} Hz`
        : running
          ? "Listening..."
          : "Paused"
      }
    </div>
  )
}

type AudioConfig = { context: AudioContext, node: PitchNode }

function AudioRecorderControl() {
  const [audio, setAudio] = useState<AudioConfig | undefined>(undefined);

  const [running, setRunning] = useState<boolean>(false);

  const [latestPitch, setLatestPitch] = useState<Number | undefined>(undefined);

  if (!audio) {
    return (
      <button
        onClick={async () => {
          setAudio(await setupAudio(setLatestPitch));
          setRunning(true);
        }}
      >
        Start Listening
      </button>
    )
  }

  const { context } = audio;
  return (
    <div>
      <button
        onClick={async () => {
          if (running) {
            await context.suspend();
            setRunning(context.state === 'running');
          } else {
            await context.resume();
            setRunning(context.state === 'running');
          }
        }}
        disabled={context.state !== 'running' && context.state !== 'suspended'}
      >
        {running ? 'Pause' : 'Resume'}
      </button>
      <PitchReadout running={running} latestPitch={latestPitch} />
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        WASM Audio Tutotorial
      </header>
      <AudioRecorderControl />
    </div>
  );
}

export default App;
