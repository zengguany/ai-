import React, { useState, useRef, useEffect } from 'react';
import { generateStoryFromImage, generateSpeechFromText } from './services/geminiService';
import { decodeAudioData, playBuffer } from './utils/audioUtils';
import { AudioStatus } from './types';
import Spinner from './components/Spinner';

// Icons
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 6v12.25c0 1.243.964 2.25 2.25 2.25Zm12-15h.008v.008H13.5V3.75Zm0 0h.008v.008H13.5V3.75Z" />
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
  </svg>
);

const StopIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5M16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
  </svg>
);

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [story, setStory] = useState<string>("");
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>(AudioStatus.IDLE);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB (Image must be under 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImage(base64);
      setStory("");
      setError(null);
      setAudioStatus(AudioStatus.IDLE);
      stopAudio();
      
      // Automatically trigger generation
      handleGenerateStory(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateStory = async (base64Image: string) => {
    setIsGeneratingStory(true);
    setError(null);
    try {
      const generatedStory = await generateStoryFromImage(base64Image);
      setStory(generatedStory);
    } catch (err) {
      setError("无法生成故事，请检查网络或稍后重试。(Failed to generate story)");
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      audioSourceRef.current = null;
    }
    setAudioStatus(AudioStatus.IDLE);
  };

  const handleReadAloud = async () => {
    if (audioStatus === AudioStatus.PLAYING) {
      stopAudio();
      return;
    }

    if (!story) return;

    setAudioStatus(AudioStatus.LOADING);
    
    try {
      // Initialize AudioContext on user gesture
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const base64Audio = await generateSpeechFromText(story);
      const audioBuffer = await decodeAudioData(base64Audio, audioContextRef.current);

      setAudioStatus(AudioStatus.PLAYING);
      audioSourceRef.current = playBuffer(audioBuffer, audioContextRef.current, () => {
        setAudioStatus(AudioStatus.IDLE);
        audioSourceRef.current = null;
      });

    } catch (err) {
      console.error(err);
      setError("语音合成失败 (TTS Failed)");
      setAudioStatus(AudioStatus.ERROR);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-stone-100 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center font-sans text-stone-800">
      
      <header className="text-center mb-12 max-w-2xl">
        <div className="flex justify-center mb-4 text-indigo-600">
          <SparklesIcon />
        </div>
        <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2 tracking-tight">
          AI 灵感绘梦
        </h1>
        <p className="text-stone-500 text-lg font-light">
          上传一张图片，让 AI 为你捕捉光影，讲述一个全新的故事。
        </p>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Image Upload & Preview */}
        <div className="flex flex-col gap-6">
          <div 
            className={`
              relative group w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white shadow-sm border-2 border-dashed border-stone-300 
              flex flex-col items-center justify-center transition-all duration-300 cursor-pointer
              ${!image ? 'hover:border-indigo-400 hover:bg-indigo-50' : 'border-none'}
            `}
            onClick={triggerFileInput}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            
            {image ? (
              <>
                <img 
                  src={image} 
                  alt="Uploaded context" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                   <div className="opacity-0 group-hover:opacity-100 bg-white/90 text-stone-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                     更换图片 (Change Image)
                   </div>
                </div>
              </>
            ) : (
              <div className="text-center p-6">
                <div className="mx-auto w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4 group-hover:text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                  <ImageIcon />
                </div>
                <h3 className="text-lg font-medium text-stone-700 mb-1">点击上传图片</h3>
                <p className="text-sm text-stone-400">支持 JPG, PNG (最大 5MB)</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Story & Controls */}
        <div className="flex flex-col gap-6">
          
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 h-full min-h-[400px] flex flex-col relative overflow-hidden">
            
            {/* Header */}
            <div className="border-b border-stone-100 px-6 py-4 flex justify-between items-center bg-stone-50/50">
              <h2 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
                <span>📖</span> 故事开篇 (Story Opening)
              </h2>
              {story && !isGeneratingStory && (
                 <button
                   onClick={handleReadAloud}
                   disabled={audioStatus === AudioStatus.LOADING}
                   className={`
                     flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                     ${audioStatus === AudioStatus.PLAYING 
                       ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                       : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95'
                     }
                     disabled:opacity-50 disabled:cursor-not-allowed
                   `}
                 >
                   {audioStatus === AudioStatus.LOADING ? (
                     <><Spinner className="w-4 h-4" /> 准备中...</>
                   ) : audioStatus === AudioStatus.PLAYING ? (
                     <><StopIcon /> 停止朗读</>
                   ) : (
                     <><PlayIcon /> 朗读故事</>
                   )}
                 </button>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto relative">
              {!image ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center">
                  <p className="mb-2 text-4xl">✨</p>
                  <p>请先上传图片<br/>AI 将为你开启想象之旅</p>
                </div>
              ) : isGeneratingStory ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 animate-pulse">
                  <Spinner className="w-8 h-8 text-indigo-600" />
                  <p className="text-indigo-600 font-medium">正在观察图片细节，构思故事中...</p>
                  <div className="w-3/4 h-2 bg-stone-100 rounded"></div>
                  <div className="w-full h-2 bg-stone-100 rounded"></div>
                  <div className="w-5/6 h-2 bg-stone-100 rounded"></div>
                </div>
              ) : story ? (
                <article className="prose prose-stone prose-lg max-w-none leading-relaxed font-serif text-stone-700 animate-in fade-in duration-700">
                  {story.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4 indent-8 text-justify">
                      {paragraph}
                    </p>
                  ))}
                </article>
              ) : (
                 <div className="h-full flex items-center justify-center text-red-400">
                   {error || "未知状态"}
                 </div>
              )}
            </div>

            {/* Decorative Footer */}
            <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50"></div>
          </div>

          {error && !isGeneratingStory && !story && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm text-center border border-red-100">
              {error}
            </div>
          )}
        </div>
      </main>
      
      <footer className="mt-16 text-stone-400 text-sm text-center">
        <p>Powered by Gemini 3 Pro Preview & Gemini 2.5 Flash TTS</p>
      </footer>
    </div>
  );
}