let config = {
    ws_uri: "ws://" + location.hostname + ":8888/kurento",
    ice_servers: undefined,
    file_uri: 'file:///recordings/sintel.mp4'
}
let kmsPlayer = null;

window.onload = (event) => {
    const mainElement = document.getElementById('main');
    const videoPlayer = new VideoPlayer(mainElement);

    kmsPlayer = new KurentoPlayer(videoPlayer, config)
};
