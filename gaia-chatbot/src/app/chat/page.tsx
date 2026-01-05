'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Plus,
  Bot,
  User,
  Copy,
  Check,
  Search,
  History,
  Flame,
  PieChart,
  DollarSign,
  TrendingUp,
  Zap,
  Wrench,
  MessageSquare,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
  gradient: string;
}

// Enhanced markdown renderer
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    let processed: React.ReactNode = line;

    if (line.startsWith('### ')) {
      processed = <h3 key={idx} className="text-lg font-bold mt-4 mb-2 text-gaia-off-white">{line.slice(4)}</h3>;
    } else if (line.startsWith('## ')) {
      processed = <h2 key={idx} className="text-xl font-bold mt-5 mb-2 text-gaia-off-white">{line.slice(3)}</h2>;
    } else if (line.startsWith('# ')) {
      processed = <h1 key={idx} className="text-2xl font-bold mt-5 mb-3 text-gaia-off-white">{line.slice(2)}</h1>;
    } else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2);
      processed = (
        <div key={idx} className="flex gap-3 ml-1 my-1.5">
          <span className="text-gaia-cyan">•</span>
          <span className="flex-1">{formatInlineStyles(content)}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, '');
      const num = line.match(/^\d+/)?.[0];
      processed = (
        <div key={idx} className="flex gap-3 ml-1 my-1.5">
          <span className="text-gaia-purple font-semibold min-w-[20px]">{num}.</span>
          <span className="flex-1">{formatInlineStyles(content)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      processed = <div key={idx} className="h-3" />;
    } else {
      processed = <p key={idx} className="my-1.5 leading-relaxed">{formatInlineStyles(line)}</p>;
    }

    elements.push(processed);
  });

  return <div className="space-y-0.5">{elements}</div>;
}

function formatInlineStyles(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gaia-off-white">{part.slice(2, -2)}</strong>;
    }
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((codePart, j) => {
      if (codePart.startsWith('`') && codePart.endsWith('`')) {
        return (
          <code key={`${i}-${j}`} className="bg-gaia-purple/20 px-2 py-0.5 rounded text-gaia-cyan text-sm font-mono border border-gaia-purple/30">
            {codePart.slice(1, -1)}
          </code>
        );
      }
      return codePart;
    });
  });
}

const suggestions: Suggestion[] = [
  {
    icon: <PieChart className="w-5 h-5" />,
    title: 'Portfolio',
    description: 'View holdings with USD values',
    prompt: "Show me my complete portfolio with all token values",
    gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: 'SOL Price',
    description: 'Real-time market data',
    prompt: "What's the current price of SOL with full market analysis?",
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
  },
  {
    icon: <Flame className="w-5 h-5" />,
    title: 'Trending',
    description: 'Hot tokens right now',
    prompt: "What are the trending tokens on Solana right now?",
    gradient: 'from-orange-500 via-red-500 to-pink-500',
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Analyze Token',
    description: 'Deep dive into metrics',
    prompt: "Analyze the BONK token - give me price, volume, and liquidity",
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
  },
  {
    icon: <History className="w-5 h-5" />,
    title: 'Activity',
    description: 'Transaction history',
    prompt: "Show me my recent transaction history",
    gradient: 'from-amber-500 via-orange-500 to-red-500',
  },
];

export default function ChatPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (address: string) => `${address.slice(0, 4)}...${address.slice(-4)}`;

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((msg) => ({ role: msg.role, content: msg.content })),
          walletAddress: publicKey?.toString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!connected) return null;

  return (
    <div className="min-h-screen bg-gaia-space flex flex-col relative">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-purple w-[400px] h-[400px] -top-20 -right-20 opacity-30" />
        <div className="orb orb-cyan w-[300px] h-[300px] bottom-40 -left-20 opacity-30" />
      </div>
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="relative flex justify-between items-center p-4 border-b border-white/5 bg-gaia-space/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gaia-purple to-gaia-cyan rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold gradient-text">GAIA</span>
            <p className="text-xs text-gaia-paragraph">AI Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setMessages([]); setInput(''); }}
            className="flex items-center gap-2.5 px-5 py-3 text-base bg-gradient-to-r from-gaia-purple to-gaia-cyan rounded-xl font-semibold hover:opacity-90 transition-all group shadow-lg shadow-gaia-purple/25"
          >
            <MessageSquare className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            <span className="text-white">Chat</span>
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2.5 px-5 py-3 text-base glass-purple rounded-xl font-semibold hover:bg-gaia-purple/20 transition-all group"
          >
            <PieChart className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="gradient-text">Dashboard</span>
          </button>

          <button
            onClick={() => router.push('/tools')}
            className="flex items-center gap-2.5 px-5 py-3 text-base glass-purple rounded-xl font-semibold hover:bg-gaia-purple/20 transition-all group"
          >
            <Wrench className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="gradient-text">Tools</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 glass rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
            <span className="text-sm text-gaia-paragraph font-mono">
              {truncateAddress(publicKey?.toString() || '')}
            </span>
            <button onClick={handleCopyAddress} className="p-1 hover:bg-white/10 rounded transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gaia-paragraph" />}
            </button>
          </div>

          <WalletMultiButton />
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="text-center space-y-6 mb-12 animate-fade-in">
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-gradient-to-r from-gaia-purple via-gaia-pink to-gaia-cyan rounded-3xl blur-xl opacity-40 animate-glow" />
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center shadow-2xl">
                  <Bot className="w-12 h-12 text-white" />
                </div>
              </div>
              <h1 className="text-4xl font-bold">
                <span className="gradient-text">Welcome to GAIA</span>
              </h1>
              <p className="text-gaia-paragraph max-w-lg text-lg">
                Your AI-powered Solana assistant with real-time market data, portfolio tracking, and intelligent insights.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s.prompt)}
                  className="premium-card p-4 rounded-xl text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    {s.icon}
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-gaia-purple transition-colors">{s.title}</h3>
                  <p className="text-sm text-gaia-paragraph">{s.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-gaia-paragraph animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span>Real-time data</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Instant responses</span>
              </div>
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-gaia-purple" />
                <span>Portfolio sync</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 message-enter ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-gaia-purple to-gaia-pink text-white rounded-tr-md shadow-lg shadow-gaia-purple/20'
                    : 'glass rounded-tl-md'
                }`}>
                  {message.role === 'assistant' ? renderMarkdown(message.content) : <p className="whitespace-pre-wrap">{message.content}</p>}
                  <span className={`text-xs mt-3 block ${message.role === 'user' ? 'text-white/60' : 'text-gaia-paragraph/60'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {message.role === 'user' && (
                  <div className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gaia-paragraph" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 message-enter">
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gaia-purple to-gaia-cyan flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="glass p-4 rounded-2xl rounded-tl-md">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 bg-gaia-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2.5 h-2.5 bg-gaia-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2.5 h-2.5 bg-gaia-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-gaia-paragraph">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-white/5 bg-gaia-space/80 backdrop-blur-xl">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gaia-purple via-gaia-pink to-gaia-cyan rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
            <div className="relative flex gap-3 items-end glass rounded-2xl p-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about SOL prices, your portfolio, trending tokens..."
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-gaia-off-white placeholder-gaia-paragraph/50 max-h-32 min-h-[28px]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-r from-gaia-purple to-gaia-pink text-white hover:shadow-lg hover:shadow-gaia-purple/30 hover:scale-105 active:scale-95'
                    : 'bg-white/5 text-gaia-paragraph cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-xs text-gaia-paragraph/40 text-center mt-3">
            Powered by GPT-4 • Real-time data from CoinGecko & DexScreener
          </p>
        </div>
      </main>
    </div>
  );
}
