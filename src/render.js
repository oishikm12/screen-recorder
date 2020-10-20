// eslint-disable-next-line import/no-extraneous-dependencies
const { desktopCapturer, remote } = require('electron');
const { writeFile } = require('fs');

const { dialog, Menu } = remote; // IPC menu

// global state of media
let mediaRecorder; // MediaRecorder instance to capture footage
let recordedChunks = []; // Media will be recorded as chunks
let format = 'video/webm; codecs=vp9';

// buttons
const videoElement = document.querySelector('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const videoSelectBtn = document.getElementById('videoSelectBtn');
const formatSelectBtn = document.getElementById('formatSelectBtn');

/**
 * Informs that recording has started
 */
function handleStart() {
  recordedChunks = [];
  mediaRecorder.start();
  startBtn.classList.add('is-danger');
  startBtn.innerText = 'Recording';
}

/**
 * Informs that recording has stopped
 */
function handleStop() {
  mediaRecorder.stop();
  startBtn.classList.remove('is-danger');
  startBtn.innerText = 'Start';
}

/**
 * Saves each chunk to recording
 * @param {Objetc} e Chunk of recording
 */
function handleDataAvailable(e) {
  console.log('video data available');
  recordedChunks.push(e.data);
}

/**
 * Saves the video file on end
 */
async function handleEnd() {
  // Combine chunks to blob data type
  const blob = new Blob(recordedChunks, {
    type: format
  });

  // Convert BLOB to buffer data
  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `vid-${Date.now()}.webm`
  });

  if (filePath) {
    writeFile(filePath, buffer, () => console.log('Video saved successfully!'));
  }
}

/**
 * Changes the video stream to open selected
 * @param {Object} source Source selected
 */
async function selectSource(source) {
  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id
      }
    }
  };

  // Create a Stream
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();

  // Create the Media Recorder
  const options = { mimeType: format };
  mediaRecorder = new MediaRecorder(stream, options);

  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleEnd;
}

/**
 * Gets all available video sources from OS
 */
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ['window', 'screen']
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.name,
        click: () => selectSource(source)
      };
    })
  );

  videoOptionsMenu.popup();
}

/**
 * Determines output video format
 */
function getVideoContainer() {
  const inputSources = [
    { name: 'WEBM', mime: 'video/webm; codecs=vp9' },
    { name: 'MP4', mime: 'video/mp4' }
  ];

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.name,
        click: () => {
          formatSelectBtn.innerText = source.name;
          format = source.mime;
        }
      };
    })
  );

  videoOptionsMenu.popup();
}

startBtn.addEventListener('click', handleStart);
stopBtn.addEventListener('click', handleStop);
videoSelectBtn.addEventListener('click', getVideoSources);
formatSelectBtn.addEventListener('click', getVideoContainer);
