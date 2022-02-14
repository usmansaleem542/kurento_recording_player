class VideoMetaData {
    constructor(mediaInfo) {
        this.Duration = mediaInfo.duration
        this.IsSeekable = mediaInfo.isSeekable
        this.SeekableEnd = mediaInfo.seekableEnd
        this.SeekableInit = mediaInfo.seekableInit
    }
}

function showSpinner() {
    for (var i = 0; i < arguments.length; i++) {
        arguments[i].poster = 'img/transparent-1px.png';
        arguments[i].style.background = "center transparent url('img/spinner.gif') no-repeat";
    }
}

function hideSpinner() {
    for (var i = 0; i < arguments.length; i++) {
        arguments[i].src = '';
        arguments[i].poster = 'img/webrtc.png';
        arguments[i].style.background = '';
    }
}

function onError(error) {
    if (error) console.log(error);
}

class KurentoPlayer
{
    MediaInfo = null;
    KmsClient = null;
    KmsPlayerEndpoint = null;
    KmsEndPoint = null;
    KmsPipeline = null;
    WebrtcPeer = null;

    constructor(video_player, config) {
        this.WsUri = config.ws_uri;
        this.IceServers = config.ice_servers;
        this.FileUri = config.file_uri;

        this.VideoPlayer = video_player;
        this.VideoPlayerElement = this.VideoPlayer.getVideoElement();
        this.VideoPlayer.setKurentoClient(this);
    }

    Pause()
    {
        if (this.KmsPlayerEndpoint == null)
            return

        this.KmsPlayerEndpoint.pause();
    }

    Resume()
    {
        if (this.KmsPlayerEndpoint == null)
        {
            this.Start();
            return
        }

        this.KmsPlayerEndpoint.play();
    }

    Seek(position=null) {
        if (this.KmsPlayerEndpoint == null)
            return

        if (position == null)
            position = Math.floor(Math.random() * this.MediaInfo.SeekableEnd);

        this.KmsPlayerEndpoint.setPosition(position*1000);
    }

    async Start()
    {
        showSpinner(this.VideoPlayerElement);

        var options = {
            remoteVideo: this.VideoPlayerElement
        };
        if (this.IceServers) {
            options.configuration = {
                iceServers: JSON.parse(this.IceServers)
            };
        }
        else {
            // console.log("Use Free Ice")
        }

        this.WebrtcPeer = await kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options);
        this.WebrtcPeer.generateOffer((error, offer) => {
            this.onOfferCreated(offer);
        });
    }

    Stop()
    {
        hideSpinner(this.VideoPlayerElement);

        this.KmsPipeline.release();
        this.WebrtcPeer.dispose();
        this.VideoPlayerElement.src = "";
    }

    setMediaInfo(media_info)
    {
        this.MediaInfo = new VideoMetaData(media_info);
        this.VideoPlayer.VideoDuration = this.MediaInfo.SeekableEnd/1000.0;
    }

    startPlayer()
    {
         this.KmsEndPoint.on('MediaFlowInStateChange', (event) => {
            this.KmsPlayerEndpoint.getVideoInfo((error, result) => {
                if (error) return onError(error);

                if (event.mediaType === 'VIDEO' && event.state === 'FLOWING') {
                    this.setMediaInfo(result);
                    // console.log("Media MetaData --> ", this.MediaInfo);
                }
            });
        });

        this.KmsPlayerEndpoint.on('EndOfStream', (event) => {
            console.log(event);
            this.Stop();
        });

        this.KmsPlayerEndpoint.connect(this.KmsEndPoint, (error) => {
            if (error) return onError(error);

            this.KmsPlayerEndpoint.play( (error) => {
                if (error) return onError(error);
                // console.log("Playing ...");
            });
        });
    }

    async onOfferCreated(offer) {
        kurentoClient(this.WsUri, (error, client) => {
            this.KmsClient = client;

            this.KmsClient.create('MediaPipeline', (error, pipeline) => {
                this.KmsPipeline = pipeline;

                this.KmsPipeline.create('WebRtcEndpoint', (error, kmsEndPoint) => {
                    if (error) return onError(error);

                    this.KmsEndPoint = kmsEndPoint;

                    this.setIceCandidateCallbacks(onError)
        
                    this.KmsEndPoint.processOffer(offer, (error, answer) => {
                        if (error) return onError(error);

                        this.KmsEndPoint.gatherCandidates(onError);
                        this.WebrtcPeer.processAnswer(answer);
                    });
        
                    var options = { uri: this.FileUri }
                    // console.log("Options: ", options);
                    this.KmsPipeline.create("PlayerEndpoint", options, (error, player) => {
                        if (error) return onError(error);

                        this.KmsPlayerEndpoint = player;
                        this.startPlayer();

                    });
                });
            });
        });
    };

    setIceCandidateCallbacks(onerror) {
        if (!this.WebrtcPeer)
            return;
        if(!this.KmsEndPoint)
            return;

        this.WebrtcPeer.on('icecandidate', (candidate) => {
            candidate = kurentoClient.getComplexType('IceCandidate')(candidate);
            this.KmsEndPoint.addIceCandidate(candidate, onerror)
        });

        this.KmsEndPoint.on('IceCandidateFound', (event) => {
            var candidate = event.candidate;
            this.WebrtcPeer.addIceCandidate(candidate, onerror);
        });
    };
}
