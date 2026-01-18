const API_BASE_URL = '';
document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        startButton: document.getElementById('startInterviewButton'),
        sections: {
            start: document.getElementById('start-section'),
            interview: document.getElementById('interview-section'),
            result: document.getElementById('result-section')
        },
        video: document.getElementById('videoElement'),
        videoContainer: document.getElementById('video-container'),
        question: document.getElementById('interview-question'),
        timers: {
            prep: document.getElementById('preparation-timer'),
            rec: document.getElementById('recording-timer')
        },
        timerDisplays: {
            prep: document.getElementById('prep-time'),
            rec: document.getElementById('rec-time')
        },
        status: document.getElementById('status-message'),
        result: document.getElementById('result')
    };

    let mediaRecorder;
    let recordedChunks = [];
    const prepTime = 20;
    const recTime = 30;
    let currentTimer;

    async function setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 },
                audio: true 
            });
            elements.video.srcObject = stream;
            
            const options = { mimeType: 'video/mp4' };
            mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'video/mp4' });
                console.log('Recording stopped. Blob size:', blob.size, 'bytes');
                if (blob.size > 0) {
                    uploadVideo(blob);
                } else {
                    showError("Recording failed: No data captured.");
                }
            };
        } catch (error) {
            console.error('Error accessing camera:', error);
            showError('Unable to access camera. Please ensure you have given permission and try again.');
        }
    }

    function showSection(section) {
        Object.values(elements.sections).forEach(s => s.classList.add('hidden'));
        elements.sections[section].classList.remove('hidden');
    }

    function updateTimer(timerElement, time) {
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startTimer(phase) {
        let timeLeft = phase === 'prep' ? prepTime : recTime;
        updateTimer(elements.timerDisplays[phase], timeLeft);
        elements.timers[phase].classList.remove('hidden');
        
        return setInterval(() => {
            timeLeft--;
            updateTimer(elements.timerDisplays[phase], timeLeft);
            if (timeLeft <= 0) {
                clearInterval(currentTimer);
                elements.timers[phase].classList.add('hidden');
                if (phase === 'prep') startRecording();
                else stopRecording();
            }
        }, 1000);
    }

    function startPreparationTimer() {
        showSection('interview');
        elements.status.textContent = "Prepare your answer...";
        currentTimer = startTimer('prep');
    }

    function startRecording() {
        elements.videoContainer.classList.remove('hidden');
        recordedChunks = [];
        mediaRecorder.start(1000); // Record in 1-second chunks
        elements.status.textContent = "Recording in progress...";
        currentTimer = startTimer('rec');
        console.log('Recording started');
    }

    function stopRecording() {
        mediaRecorder.stop();
        elements.status.textContent = "Processing your response...";
        showSection('result');
        console.log('Recording stopped');
    }

    async function uploadVideo(videoUrl) {
        console.log('Uploading video from URL:', videoUrl);
    
        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_url: videoUrl })
            });
    
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP error: ${response.status} - ${response.error}`);
            }
    
            const data = await response.json();
            console.log('Received data:', data);
            displayResults(data);
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        }
    }

    function displayResults(data) {
        let resultHTML = '<h3>Analysis Results:</h3>';
        console.log("data", data);
        
        if (data.error) {
            resultHTML += `<p class="error">Error: ${data.error}</p>`;
        } else {
            // Dynamically display all fields from the response
            resultHTML += '<div class="score-grid">';
            
            // Helper to convert snake_case to Title Case
            const formatLabel = (key) => {
                return key
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            };
            
            // Separate numeric scores from other data
            const scores = [];
            const arrays = [];
            const strings = [];
            
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'number') {
                    scores.push({ key, value });
                } else if (Array.isArray(value)) {
                    arrays.push({ key, value });
                } else if (typeof value === 'string' && value.length > 0) {
                    strings.push({ key, value });
                }
            }
            
            // Display numeric scores
            scores.forEach(({ key, value }) => {
                resultHTML += `
                    <div class="score">
                        <span class="score-label">${formatLabel(key)}</span>
                        <span class="score-value">${value}/10</span>
                    </div>
                `;
            });
            resultHTML += '</div>';
            
            // Display string values
            strings.forEach(({ key, value }) => {
                resultHTML += `<p><strong>${formatLabel(key)}:</strong> ${value}</p>`;
            });
            
            // Display arrays (like key_points)
            arrays.forEach(({ key, value }) => {
                if (value.length > 0) {
                    resultHTML += `<h4>${formatLabel(key)}:</h4><ul>`;
                    value.forEach(item => {
                        resultHTML += `<li>${item}</li>`;
                    });
                    resultHTML += '</ul>';
                }
            });
            
            // Show message if no arrays had content
            if (arrays.every(({ value }) => value.length === 0)) {
                resultHTML += '<p>No additional details found in the analysis.</p>';
            }
        }

        elements.result.innerHTML = resultHTML;
    }

    function showError(message) {
        elements.result.innerHTML = `
            <p class="error">Error: ${message}</p>
            <p>Please try again. If the problem persists, ensure you're recording for the full time and that your video and audio are working correctly.</p>
        `;
    }

    elements.startButton.addEventListener('click', () => {
        showSection('result');
        elements.result.innerHTML = '<p>Analyzing video... This may take a minute.</p>';

        // Replace with your Vultr Object Storage URL
        // const videoUrl = 'uploads/test.mp4';
        const videoUrl = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';

        uploadVideo(videoUrl);

        // fetch('/upload', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ url: videoUrl })
        // })
        // .then(response => {
        //     if (!response.ok) {
        //         return response.json().then(err => {
        //             throw new Error(err.error || `HTTP error! status: ${response.status}`);
        //         });
        //     }
        //     return response.json();
        // })
        // .then(data => {
        //     console.log('Received data:', data);
        //     displayResults(data);
        // })
        // .catch(error => {
        //     console.error('Error:', error);
        //     showError(error.message);
        // });
    });
});