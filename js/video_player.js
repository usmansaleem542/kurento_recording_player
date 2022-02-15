class VideoPlayer {
    constructor(parent) {
        this.Parent = parent;
        this.Id = Math.floor(Math.random() * 10) + 1;
        this.SkipTime = 10.0;
        this.VideoHtml = this.getVideoHtml();
        this.Parent.append(this.VideoHtml);
        this.KurentoClient = null;
        this.VideoDuration = null;
        this.CurrentDuration = 0;

        /* Get Our Elements */
        this.Video = document.getElementById(`video-${this.Id}`);
        this.Progress = document.getElementById(`progress-${this.Id}`);
        this.ProgressBar = document.getElementById(`progress-filled-${this.Id}`);
        this.Toggle = document.getElementById(`toggle-play-${this.Id}`);
        this.SkipBackward = document.getElementById(`skip-backward-${this.Id}`);
        this.SkipForward = document.getElementById(`skip-forward-${this.Id}`);
        this.Volume = document.getElementById(`volume-${this.Id}`);
        this.Fullscreen = document.getElementById(`fullscreen-${this.Id}`);

        this.registerEvents();
        this.PrevTimestamp = null;
    }

    setKurentoClient(kurento_client)
    {
        this.KurentoClient = kurento_client;
    }

    getVideoElement()
    {
        return this.Video;
    }

    registerEvents() {
        /* Hook up the event listeners */
        this.Video.addEventListener('click', () => { this.togglePlay() });
        this.Video.addEventListener('play', () => { this.updateButton() });
        this.Video.addEventListener('pause', () => { this.updateButton() });
        this.Video.addEventListener('timeupdate', (e) => { this.handleProgress(e) });
        this.Toggle.addEventListener('click', () => { this.togglePlay() });
        this.Fullscreen.addEventListener('click', () => { this.fullscreen() });

        this.SkipBackward.addEventListener('click', () => { this.skip(-this.SkipTime) });
        this.SkipForward.addEventListener('click', () => { this.skip(this.SkipTime) });


        this.progressMousedown = false;
        this.Progress.addEventListener('click', (e) => { this.scrub(e) });
        this.Progress.addEventListener('mousemove', (e) => { if (this.progressMousedown) this.scrub(e) });
        this.Progress.addEventListener('mousedown', () => {  this.progressMousedown = true;});
        this.Progress.addEventListener('mouseup', () => { this.progressMousedown = false });

        this.volumeMousedown = false;
        this.Volume.addEventListener('change', (e) => { this.handleRangeUpdate(e) });
        this.Volume.addEventListener('mousemove', (e) => { if (this.volumeMousedown) this.handleRangeUpdate(e) });
        this.Volume.addEventListener('mousedown', () => {  this.volumeMousedown = true;});
        this.Volume.addEventListener('mouseup', () => { this.volumeMousedown = false });
    }

    getVideoHtml() {
        const myhtml = `
        <video id="video-${this.Id}" class="player__video viewer" autoplay></video>
        
        <div class="player">
            <div id="progress-${this.Id}" class="progress">
                <div id="progress-filled-${this.Id}" class="progress__filled"></div>
            </div>
            
            <div class="player__controls">
                <div class="player__left_controls">
                    <button id="skip-backward-${this.Id}" class="player__button" style="font-size:24px"><i class="material-icons">skip_previous</i></button>
                    <button id="toggle-play-${this.Id}" class="player__button" style="font-size:24px"><i class="material-icons">play_circle_outline</i></button>
                    <button id="skip-forward-${this.Id}" class="player__button" style="font-size:24px"><i class="material-icons">skip_next</i></button>
                </div>
                <div class="player__right_controls">
                    <input id="volume-${this.Id}" type="range" name="volume" class="player__slider" min="0" max="1" step="0.05" value="1">
                    <button id="fullscreen-${this.Id}" class="player__button fullscreen" style="font-size:24px"><i class="material-icons">fullscreen</i></button>
                </div> 
            </div> 
        </div>
        `;
        const myfragment = document.createRange().createContextualFragment(myhtml);
        return myfragment;
    }

    /*functions */
    togglePlay() {
        // const method = this.Video.paused ? 'play' : 'pause';
        // this.Video[method]();
        if (this.Video.paused) {
            this.KurentoClient?.Resume();
            this.Video.play();
        } else {
            this.KurentoClient?.Pause();
            this.Video.pause();
        }
    }

    updateButton() {
        const icon = this.Video.paused ? 'play_circle_outline' : 'pause_circle_outline';
        this.Toggle.innerHTML = `<i class="material-icons">${icon}</i>`;
    }

    skip(skip_time) {
        // console.log("Before: ", this.CurrentDuration)
        this.CurrentDuration += skip_time;
        this.KurentoClient?.Seek(this.CurrentDuration);
        // console.log("After: ", this.CurrentDuration)
    }

    handleRangeUpdate(e) {
        this.Video.volume = this.Volume.value;
    }

    handleProgress(event) {
        // console.log(this.ProgressBar.style.flexBasis, this.CurrentDuration);
        if (this.PrevTimestamp == null)
            this.PrevTimestamp = event.timeStamp

        const percent = (this.CurrentDuration / this.VideoDuration) * 100;
        const diff = event.timeStamp-this.PrevTimestamp
        this.ProgressBar.style.flexBasis = `${percent}%`;
        this.CurrentDuration += (diff / 1000.0);
        this.PrevTimestamp = event.timeStamp
    }

    scrub(e) {
        // console.log("Updating ... ")
        const scrubTime = (e.offsetX / this.Progress.offsetWidth) * this.VideoDuration;
        this.ProgressBar.style.flexBasis = `${e.offsetX / this.Progress.offsetWidth}%`;
        this.CurrentDuration = scrubTime;
        this.KurentoClient?.Seek(this.CurrentDuration);
    }

    fullscreen() {
        if (!document.fullscreenElement) {
            this.Parent.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }
}

// Creating player HTML
// const mainElement = document.getElementById('main');
// const player = new VideoPlayer(mainElement);
// player.Video.src = "652333414.mp4";

// const mainElement2 = document.getElementById('main2');
// const player2 = new VideoPlayer(mainElement2);