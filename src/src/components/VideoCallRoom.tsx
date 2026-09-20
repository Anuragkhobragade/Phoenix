import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Appointment, UserProfile } from '../types';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Copy, Check, Users } from 'lucide-react';

interface VideoCallRoomProps {
    appointment: Appointment;
    userProfile: UserProfile;
    onLeave: () => void;
}

const servers: RTCConfiguration = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302',
            ],
        },
        {
            urls: [
                'turn:openrelay.metered.ca:80',
                'turn:openrelay.metered.ca:443',
                'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10,
};

export default function VideoCallRoom({ appointment, userProfile, onLeave }: VideoCallRoomProps) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pc = useRef<RTCPeerConnection | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    const [callStatus, setCallStatus] = useState<string>('Initializing media devices...');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isRemoteVideoActive, setIsRemoteVideoActive] = useState(true);

    const isDoctor = userProfile.role === 'doctor';

    // Copy Appointment ID
    const handleCopyId = () => {
        navigator.clipboard.writeText(appointment.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Keep local video element synced with localStream across re-renders
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.warn("Local stream playback error:", e));
        }
    }, [localStream]);

    // 1. Auto-bind stream using useEffect
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch((e) => console.warn("Autoplay block:", e));
        }
    }, [remoteStream]);

    useEffect(() => {
        let isMounted = true;
        let localMediaStream: MediaStream | null = null;
        let peerConnection: RTCPeerConnection | null = null;
        let unsubscribeRoom: (() => void) | null = null;
        const roomRef = doc(db, 'videoRooms', appointment.id);

        async function setupCall() {
            try {
                // Get Camera and Microphone access with fallbacks
                try {
                    localMediaStream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                        audio: true
                    });
                } catch (err) {
                    console.warn("Failed to get both video and audio, trying audio-only fallback:", err);
                    try {
                        localMediaStream = await navigator.mediaDevices.getUserMedia({
                            video: false,
                            audio: true
                        });
                        setIsVideoOff(true);
                    } catch (audioErr) {
                        console.warn("Failed to get audio-only stream, trying video-only fallback:", audioErr);
                        try {
                            localMediaStream = await navigator.mediaDevices.getUserMedia({
                                video: true,
                                audio: false
                            });
                            setIsMuted(true);
                        } catch (videoErr) {
                            console.error("All media device combinations failed:", videoErr);
                            throw new Error("Could not access camera or microphone. Please check site permissions.");
                        }
                    }
                }

                if (!isMounted) {
                    localMediaStream.getTracks().forEach(t => t.stop());
                    return;
                }

                setLocalStream(localMediaStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = localMediaStream;
                }

                // Setup RTCPeerConnection
                peerConnection = new RTCPeerConnection(servers);
                pc.current = peerConnection;

                // Add local tracks to peer connection
                localMediaStream.getTracks().forEach(track => {
                    peerConnection!.addTrack(track, localMediaStream!);
                });

                // 2. Handle incoming remote tracks (Do not hide video screen on initial track.muted)
                peerConnection.ontrack = (event) => {
                    console.log('Remote track received:', event.track.kind, event.streams);
                    let incomingStream = event.streams[0];
                    if (!incomingStream) {
                        incomingStream = new MediaStream([event.track]);
                    }
                    
                    setRemoteStream(incomingStream);
                    setCallStatus('Connected');

                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = incomingStream;
                        remoteVideoRef.current.play().catch(e => console.warn('Remote video playback warning:', e));
                    }

                    if (event.track.kind === 'video') {
                        setIsRemoteVideoActive(true);

                        event.track.onunmute = () => {
                            if (isMounted) setIsRemoteVideoActive(true);
                        };
                        event.track.onmute = () => {
                            if (isMounted && !event.track.enabled) {
                                setIsRemoteVideoActive(false);
                            }
                        };
                        event.track.onended = () => {
                            if (isMounted) setIsRemoteVideoActive(false);
                        };
                    }
                };

                // Connection state management
                peerConnection.onconnectionstatechange = () => {
                    if (!isMounted) return;
                    const state = peerConnection!.connectionState;
                    console.log('PeerConnection state changed:', state);
                    if (state === 'connected') {
                        setCallStatus('Connected');
                    } else if (state === 'disconnected') {
                        setCallStatus('Other participant disconnected. Reconnecting...');
                    } else if (state === 'failed') {
                        setCallStatus('Connection failed. Please exit and retry.');
                    }
                };

                // Candidate Queueing & Deduplication Setup
                const addedCandidates = new Set<string>();
                const candidateQueue: RTCIceCandidateInit[] = [];

                const processOrQueueCandidates = async (candidates: RTCIceCandidateInit[]) => {
                    for (const cand of candidates) {
                        const key = JSON.stringify(cand);
                        if (addedCandidates.has(key)) continue;

                        if (peerConnection && peerConnection.currentRemoteDescription) {
                            addedCandidates.add(key);
                            try {
                                await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
                            } catch (err) {
                                console.warn('Error adding remote ICE candidate:', err);
                            }
                        } else {
                            candidateQueue.push(cand);
                        }
                    }
                };

                const drainCandidateQueue = async () => {
                    if (!peerConnection || !peerConnection.currentRemoteDescription) return;
                    while (candidateQueue.length > 0) {
                        const cand = candidateQueue.shift();
                        if (cand) {
                            const key = JSON.stringify(cand);
                            if (!addedCandidates.has(key)) {
                                addedCandidates.add(key);
                                try {
                                    await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
                                } catch (err) {
                                    console.warn('Error adding queued ICE candidate:', err);
                                }
                            }
                        }
                    }
                };

                // ROLE-BASED SIGNALING FLOW
                if (isDoctor) {
                    // DOCTOR HANDSHAKE (CALLER)
                    setCallStatus('Starting room, waiting for patient...');

                    await deleteDoc(roomRef).catch(() => { });

                    const offerDescription = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offerDescription);

                    await setDoc(roomRef, {
                        createdAt: new Date().toISOString(),
                        offer: { sdp: offerDescription.sdp, type: offerDescription.type },
                        callerName: userProfile.name || 'Doctor',
                        callerCandidates: [],
                        calleeCandidates: []
                    });

                    updateDoc(doc(db, 'appointments', appointment.id), { videoCallStatus: 'ready' }).catch(() => { });

                    peerConnection.onicecandidate = (event) => {
                        if (event.candidate && isMounted) {
                            updateDoc(roomRef, {
                                callerCandidates: arrayUnion(event.candidate.toJSON())
                            }).catch(err => console.warn('Failed to send caller candidate:', err));
                        }
                    };

                    unsubscribeRoom = onSnapshot(roomRef, async (snapshot) => {
                        if (!isMounted || !snapshot.exists()) return;
                        const data = snapshot.data();

                        if (data.calleeCandidates && Array.isArray(data.calleeCandidates)) {
                            await processOrQueueCandidates(data.calleeCandidates);
                        }

                        if (data.answer && !peerConnection!.currentRemoteDescription) {
                            await peerConnection!.setRemoteDescription(new RTCSessionDescription(data.answer));
                            await drainCandidateQueue();
                        }
                    });

                } else {
                    // PATIENT HANDSHAKE (CALLEE)
                    setCallStatus('Waiting for Doctor to join and start the call...');

                    let remoteDescriptionSet = false;

                    peerConnection.onicecandidate = (event) => {
                        if (event.candidate && isMounted) {
                            updateDoc(roomRef, {
                                calleeCandidates: arrayUnion(event.candidate.toJSON())
                            }).catch(err => console.warn('Failed to send callee candidate:', err));
                        }
                    };

                    unsubscribeRoom = onSnapshot(roomRef, async (snapshot) => {
                        if (!isMounted || !snapshot.exists()) return;
                        const data = snapshot.data();

                        if (data.callerCandidates && Array.isArray(data.callerCandidates)) {
                            await processOrQueueCandidates(data.callerCandidates);
                        }

                        if (data.offer && !remoteDescriptionSet) {
                            remoteDescriptionSet = true;
                            setCallStatus('Doctor found, connecting...');

                            await peerConnection!.setRemoteDescription(new RTCSessionDescription(data.offer));
                            const answerDescription = await peerConnection!.createAnswer();
                            await peerConnection!.setLocalDescription(answerDescription);

                            await updateDoc(roomRef, {
                                answer: { sdp: answerDescription.sdp, type: answerDescription.type },
                                calleeName: userProfile.name || 'Patient'
                            });

                            updateDoc(doc(db, 'appointments', appointment.id), { videoCallStatus: 'active' }).catch(() => { });

                            await drainCandidateQueue();
                        }
                    });
                }

            } catch (e: any) {
                console.error('Error starting video call session:', e);
                setCallStatus(`Error: ${e.message || 'Could not access media devices. Ensure camera/mic permissions are granted.'}`);
            }
        }

        setupCall();

        const unsubscribeAppt = onSnapshot(doc(db, 'appointments', appointment.id), (snapshot) => {
            if (!isMounted) return;
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.videoCallStatus === 'ended') {
                    setCallStatus('Call ended.');
                    setTimeout(() => {
                        if (isMounted) onLeave();
                    }, 1500);
                }
            }
        });

        return () => {
            isMounted = false;
            if (unsubscribeRoom) unsubscribeRoom();
            if (unsubscribeAppt) unsubscribeAppt();

            if (localMediaStream) {
                localMediaStream.getTracks().forEach(track => track.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }

            if (peerConnection) {
                peerConnection.close();
            }

            const apptRef = doc(db, 'appointments', appointment.id);
            updateDoc(apptRef, {
                videoCallStatus: 'ended'
            }).catch(() => { });
        };
    }, [appointment.id]);

    // Handle end call action
    const handleEndCall = async () => {
        try {
            const roomRef = doc(db, 'videoRooms', appointment.id);
            await deleteDoc(roomRef);
        } catch (e) {
            console.warn('Failed to delete video call signaling document:', e);
        }

        try {
            const apptRef = doc(db, 'appointments', appointment.id);
            await updateDoc(apptRef, {
                videoCallStatus: 'ended'
            });
        } catch (e) {
            console.warn('Failed to update appointment call status:', e);
        }

        onLeave();
    };

    // Toggle Mic
    const toggleMic = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Toggle Camera
    const toggleCamera = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    // Toggle Screen Share
    const toggleScreenShare = async () => {
        if (!localStream || !pc.current) return;

        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];

                const senders = pc.current.getSenders();
                const videoSender = senders.find(sender => sender.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(screenTrack);
                }

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                setIsScreenSharing(true);
            } catch (err) {
                console.error('Error starting screen share:', err);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (!pc.current || !localStream) return;

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }

        const originalVideoTrack = localStream.getVideoTracks()[0];
        const senders = pc.current.getSenders();
        const videoSender = senders.find(sender => sender.track?.kind === 'video');
        if (videoSender && originalVideoTrack) {
            videoSender.replaceTrack(originalVideoTrack);
        }

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
        }

        setIsScreenSharing(false);
    };

    const isConnected = callStatus === 'Connected';

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
            {/* Header Toolbar */}
            <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-slate-950/80 to-transparent z-25 flex items-center justify-between px-6">
                <div className="flex items-center space-x-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                            Consultation Room - {isDoctor ? 'Doctor View' : 'Patient View'}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-mono">
                            Room ID: {appointment.id}
                        </p>
                    </div>
                    <button
                        onClick={handleCopyId}
                        className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy Room ID"
                    >
                        {copied ? (
                            <span className="text-[10px] text-teal-400 font-bold font-mono">Copied!</span>
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </button>
                </div>

                <div className="flex items-center space-x-3 bg-white/5 border border-white/15 px-3 py-1.5 rounded-full text-xs font-medium">
                    <Users className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    <span>Participant: {isDoctor ? appointment.patientName : appointment.doctorName}</span>
                </div>
            </div>

            {/* Main Video Stage */}
            <div className="flex-grow min-h-0 relative flex items-center justify-center p-4">
                {/* Connecting overlay / splash state */}
                {!isConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-950/90 text-center px-4 space-y-4">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Video className="h-6 w-6 text-teal-400" />
                            </div>
                        </div>
                        <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                            {callStatus}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                            Please make sure your web camera and microphone permissions are approved. The call will connect as soon as both doctor and patient enter the room.
                        </p>
                        <button
                            onClick={handleEndCall}
                            className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <PhoneOff className="h-4 w-4" />
                            Cancel & Exit Room
                        </button>
                    </div>
                )}

                {/* 3. Ensure Remote Video Elements Render */}
                <div className="w-full h-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 relative shadow-inner">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />

                    {/* Remote Stream Video Off Overlay */}
                    {isConnected && !isRemoteVideoActive && (
                        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-3 z-15">
                            <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                                <VideoOff className="h-8 w-8 text-slate-500" />
                            </div>
                            <p className="text-sm font-semibold text-slate-400">
                                {isDoctor ? appointment.patientName : appointment.doctorName}'s camera is off
                            </p>
                        </div>
                    )}

                    {/* Remote stream description badge */}
                    <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-2">
                        <span>{isDoctor ? appointment.patientName : appointment.doctorName}</span>
                    </div>
                </div>

                {/* Floating Local Picture-In-Picture Video */}
                <div
                    className="absolute bottom-6 right-6 w-32 sm:w-48 md:w-56 aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-30 transition-all hover:border-teal-500 group"
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />

                    {/* Local Camera Off Overlay */}
                    {isVideoOff && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-15">
                            <VideoOff className="h-5 w-5 text-slate-600" />
                        </div>
                    )}

                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded-md text-[9px] font-mono tracking-wide text-slate-300">
                        {isScreenSharing ? 'Sharing Screen' : 'You'}
                    </div>
                </div>
            </div>

            {/* Bottom Glassmorphic Control Toolbar */}
            <div className="h-24 bg-gradient-to-t from-slate-950 to-transparent flex items-center justify-center px-6 shrink-0 z-40 relative">
                <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl px-6 py-3 rounded-3xl flex items-center justify-center space-x-4 sm:space-x-6 shadow-2xl max-w-lg w-full">
                    {/* Toggle Mic */}
                    <button
                        onClick={toggleMic}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${isMuted
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                            }`}
                        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>

                    {/* Toggle Camera */}
                    <button
                        onClick={toggleCamera}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${isVideoOff
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                            }`}
                        title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </button>

                    {/* Screen Share */}
                    <button
                        disabled={!isConnected}
                        onClick={toggleScreenShare}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${isScreenSharing
                                ? 'bg-teal-550 border-teal-550 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                            }`}
                        title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                    >
                        <Monitor className="h-5 w-5" />
                    </button>

                    {/* Divider line */}
                    <div className="h-8 w-px bg-slate-800" />

                    {/* End Call Button */}
                    <button
                        onClick={handleEndCall}
                        className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold p-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-rose-600/20"
                        title="End Consultation Call"
                    >
                        <PhoneOff className="h-5 w-5" />
                        <span className="hidden sm:inline">End Call</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
