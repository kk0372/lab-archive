import React, { useState, useEffect } from 'react';
import { Dna, FileText, Image, Users, BookOpen, Lock, Terminal, Activity, Plus, Trash2, X, LogOut } from 'lucide-react';
import { supabase } from './supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState('subject_a');
  const [user, setUser] = useState(null); // 로그인한 유저 정보
  
  // 모달(팝업창) 상태
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);

  // 게시글 데이터 상태
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const menus = [
    { id: 'subject_a', label: 'SUBJECT_01 : A', sub: '연구원 프로필', icon: Dna, type: 'static' },
    { id: 'subject_b', label: 'SUBJECT_02 : B', sub: '관찰 대상 프로필', icon: Activity, type: 'static' },
    { id: 'relation', label: 'INTERACTION', sub: '관계성 분석 리포트', icon: Users, type: 'static' },
    { id: 'story', label: 'CHRONICLES', sub: '스토리 기록', icon: BookOpen, type: 'board' },
    { id: 'gallery', label: 'VISUAL_DATA', sub: '커미션 / 일러스트 백업', icon: Image, type: 'board' },
    { id: 'logs', label: 'RESEARCH_LOGS', sub: '잡다한 썰 / 로그 백업', icon: FileText, type: 'board' },
  ];

  // 1. 처음 켜질 때 로그인 상태 확인
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. 탭이 바뀔 때마다 해당 탭의 게시글 불러오기
  useEffect(() => {
    if (['story', 'gallery', 'logs'].includes(activeTab)) {
      fetchPosts(activeTab);
    }
  }, [activeTab]);

  async function fetchPosts(category) {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });
    
    if (!error) setPosts(data);
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('이 연구 데이터를 영구 삭제하시겠습니까?')) return;
    await supabase.from('posts').delete().eq('id', id);
    fetchPosts(activeTab);
  }

  const currentMenu = menus.find(m => m.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 bg-grid-pattern text-slate-800 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      
      {/* 상단 연구소 헤더 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-teal-500 animate-pulse" />
          <span className="font-mono font-bold tracking-wider text-slate-700 text-sm md:text-base">
            BIO-LAB ARCHIVE // PROJECT : [커플링명]
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <button 
              onClick={() => supabase.auth.signOut()}
              className="font-mono text-xs px-3 py-1.5 rounded border bg-teal-50 border-teal-500 text-teal-700 flex items-center gap-1.5 hover:bg-teal-100"
            >
              <LogOut size={12} /> 연구원 접속 중 (로그아웃)
            </button>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="font-mono text-xs px-3 py-1.5 rounded border bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200 flex items-center gap-1.5"
            >
              <Lock size={12} /> 관리자 접속
            </button>
          )}
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <div className="flex flex-1 max-w-7xl w-full mx-auto my-6 px-4 gap-6 flex-col md:flex-row">
        
        {/* 왼쪽 사이드바 */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm">
            <div className="font-mono text-xs text-slate-400 mb-3 flex items-center gap-1">
              <Terminal size={12} /> DIRECTORY
            </div>
            <nav className="flex flex-col gap-1.5">
              {menus.map((menu) => {
                const Icon = menu.icon;
                const isActive = activeTab === menu.id;
                return (
                  <button
                    key={menu.id}
                    onClick={() => setActiveTab(menu.id)}
                    className={`text-left p-2.5 rounded-sm border transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                        : 'bg-white text-slate-600 border-transparent hover:bg-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <Icon size={18} className={`mt-0.5 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-mono text-xs font-bold tracking-tight">{menu.id.toUpperCase()}</div>
                      <div className={`text-xs mt-0.5 ${isActive ? 'text-teal-100' : 'text-slate-500'}`}>{menu.sub}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 오른쪽 본문 영역 */}
        <main className="flex-1 bg-white border border-slate-200 rounded-sm shadow-sm p-6 md:p-8 relative min-h-[600px]">
          <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
            <div>
              <span className="font-mono text-xs bg-slate-800 text-white px-2 py-0.5">CONFIDENTIAL</span>
              <h1 className="text-2xl font-bold text-slate-800 mt-2 font-mono">{currentMenu?.label}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{currentMenu?.sub}</p>
            </div>
            
            {/* 로그인 상태이고, 게시판 탭(스토리/갤러리/로그)일 때만 글쓰기 버튼 표시 */}
            {user && currentMenu?.type === 'board' && (
              <button 
                onClick={() => setShowWriteModal(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-mono text-xs px-4 py-2 rounded-sm shadow-sm transition flex items-center gap-1"
              >
                <Plus size={14} /> 데이터 기록 (WRITE)
              </button>
            )}
          </div>

          {/* 탭별 컨텐츠 렌더링 */}
          <div className="py-2">
            {activeTab === 'subject_a' && <CharacterSheet name="캐릭터 A (연구원)" role="수석 생명공학 연구원" />}
            {activeTab === 'subject_b' && <CharacterSheet name="캐릭터 B" role="관찰 대상 / 파트너" />}
            {activeTab === 'relation' && <RelationSheet />}
            
            {/* 게시판 형태 탭들 */}
            {currentMenu?.type === 'board' && (
              <BoardView 
                category={activeTab} 
                posts={posts} 
                loading={loading} 
                isAdmin={!!user} 
                onDelete={handleDelete} 
              />
            )}
          </div>
        </main>
      </div>

      {/* 로그인 모달 */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      
      {/* 글쓰기 모달 */}
      {showWriteModal && (
        <WriteModal 
          category={activeTab} 
          onClose={() => setShowWriteModal(false)} 
          onSuccess={() => {
            setShowWriteModal(false);
            fetchPosts(activeTab);
          }} 
        />
      )}
    </div>
  );
}

/* ---------------- 하위 컴포넌트들 ---------------- */

// 1. 게시판 뷰 (갤러리 / 스토리 / 로그 모양 다르게 보여주기)
function BoardView({ category, posts, loading, isAdmin, onDelete }) {
  if (loading) return <div className="text-center py-12 font-mono text-xs text-slate-400">LOADING DATA...</div>;
  if (posts.length === 0) return (
    <div className="border border-dashed border-slate-300 rounded-sm p-12 text-center font-mono text-xs text-slate-400">
      [ NO RECORDED DATA // 우측 상단 버튼을 눌러 첫 기록을 남겨보세요 ]
    </div>
  );

  // 갤러리(커미션) 탭일 때: 바둑판 배열
  if (category === 'gallery') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {posts.map(post => (
          <div key={post.id} className="border border-slate-200 rounded-sm overflow-hidden group relative bg-slate-50 flex flex-col">
            {post.image_url && (
              <img src={post.image_url} alt={post.title} className="w-full aspect-square object-cover" />
            )}
            <div className="p-3 bg-white border-t border-slate-100 flex-1 flex flex-col justify-between">
              <div>
                <div className="font-bold text-sm text-slate-800">{post.title}</div>
                <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{post.content}</p>
              </div>
              <div className="font-mono text-[10px] text-slate-400 mt-3 flex justify-between items-center">
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                {isAdmin && (
                  <button onClick={() => onDelete(post.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 스토리 & 로그 탭일 때: 연구 일지 리스트 형태
  return (
    <div className="flex flex-col gap-4">
      {posts.map(post => (
        <div key={post.id} className="border border-slate-200 rounded-sm p-5 bg-slate-50/50 hover:bg-white transition relative">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-mono text-[10px] text-teal-600 bg-teal-50 border border-teal-200 px-1.5 py-0.5 mr-2">
                LOG #{post.id}
              </span>
              <span className="font-mono text-xs text-slate-400">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
            {isAdmin && (
              <button onClick={() => onDelete(post.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
            )}
          </div>
          {post.title && <h3 className="text-lg font-bold text-slate-800 mb-2">{post.title}</h3>}
          {post.image_url && (
            <img src={post.image_url} alt="첨부" className="max-h-96 rounded border border-slate-200 my-3" />
          )}
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>
      ))}
    </div>
  );
}

// 2. 로그인 팝업창
function LoginModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('인증 실패: 이메일이나 비밀번호를 확인하세요.');
    else onClose();
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-300 rounded-sm max-w-sm w-full p-6 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
          <span className="font-mono font-bold text-sm text-slate-800">SECURITY AUTHENTICATION</span>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input 
            type="email" placeholder="연구원 ID (Email)" required
            value={email} onChange={e => setEmail(e.target.value)}
            className="border border-slate-300 p-2 text-sm rounded-sm font-mono"
          />
          <input 
            type="password" placeholder="Passcode" required
            value={password} onChange={e => setPassword(e.target.value)}
            className="border border-slate-300 p-2 text-sm rounded-sm font-mono"
          />
          {error && <p className="text-xs text-red-500 font-mono">{error}</p>}
          <button type="submit" className="bg-slate-800 text-white font-mono text-xs py-2.5 mt-2 hover:bg-teal-600 transition">
            ACCESS (접속)
          </button>
        </form>
      </div>
    </div>
  );
}

// 3. 글쓰기 & 이미지 업로드 팝업창
function WriteModal({ category, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setUploading(true);
    let image_url = null;

    // 이미지 파일이 있으면 Supabase Storage에 먼저 업로드
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
      
      if (uploadError) {
        alert('이미지 업로드 실패: ' + uploadError.message);
        setUploading(false);
        return;
      }
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      image_url = data.publicUrl;
    }

    // DB에 게시글 저장
    const { error } = await supabase.from('posts').insert([{ category, title, content, image_url }]);
    setUploading(false);
    
    if (error) alert('저장 실패: ' + error.message);
    else onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-300 rounded-sm max-w-lg w-full p-6 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
          <span className="font-mono font-bold text-sm text-slate-800">NEW RECORD // {category.toUpperCase()}</span>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input 
            type="text" placeholder="제목 (로그일 경우 비워둬도 됩니다)" 
            value={title} onChange={e => setTitle(e.target.value)}
            className="border border-slate-300 p-2 text-sm rounded-sm"
          />
          <textarea 
            rows="6" placeholder="내용을 입력하세요..." required
            value={content} onChange={e => setContent(e.target.value)}
            className="border border-slate-300 p-2 text-sm rounded-sm resize-none"
          />
          <div className="border border-dashed border-slate-300 p-3 bg-slate-50 text-xs">
            <label className="font-mono text-slate-500 block mb-1">ATTACH VISUAL DATA (이미지 첨부)</label>
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
          </div>
          <button 
            type="submit" disabled={uploading}
            className="bg-teal-600 text-white font-mono text-xs py-2.5 mt-2 hover:bg-teal-700 transition disabled:bg-slate-400"
          >
            {uploading ? 'UPLOADING DATA...' : 'SAVE RECORD (기록 저장)'}
          </button>
        </form>
      </div>
    </div>
  );
}

// 4. 캐릭터 프로필 시트 (코드에서 직접 수정하는 영역)
function CharacterSheet({ name, role }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="border border-slate-200 bg-slate-50 aspect-[3/4] flex flex-col items-center justify-center p-4 relative">
        <span className="font-mono text-xs text-slate-400">[ NO IMAGE DATA ]</span>
        <div className="absolute top-2 left-2 font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 text-slate-500">FIG 1.0</div>
      </div>
      <div className="md:col-span-2 flex flex-col gap-4">
        <div className="border border-slate-200 rounded-sm overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 font-mono text-xs font-bold text-slate-700 border-b border-slate-200">
            BASIC INFORMATION // 기본 인적 사항
          </div>
          <div className="divide-y divide-slate-200 text-sm">
            <div className="grid grid-cols-3 p-3"><span className="font-mono text-xs text-slate-500">성명 (NAME)</span><span className="col-span-2 font-medium">{name}</span></div>
            <div className="grid grid-cols-3 p-3"><span className="font-mono text-xs text-slate-500">소속/직책 (ROLE)</span><span className="col-span-2">{role}</span></div>
            <div className="grid grid-cols-3 p-3"><span className="font-mono text-xs text-slate-500">신체 스펙 (SPEC)</span><span className="col-span-2">178cm / 68kg / Rh+ AB</span></div>
          </div>
        </div>
        <div className="border border-slate-200 rounded-sm p-4 bg-teal-50/30">
          <div className="font-mono text-xs font-bold text-teal-800 mb-2">OBSERVATION NOTE // 관찰 기록 요약</div>
          <p className="text-sm text-slate-600 leading-relaxed">"캐릭터 설명이나 코멘트를 적는 공간입니다."</p>
        </div>
      </div>
    </div>
  );
}

// 5. 관계성 시트 (임시)
function RelationSheet() {
  return (
    <div className="border border-slate-200 rounded-sm p-6 bg-slate-50/50 text-center">
      <div className="font-mono text-xs text-teal-600 mb-2">INTERACTION REPORT</div>
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 my-6">
        <div className="w-32 h-32 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center font-bold">캐릭터 A</div>
        <div className="font-mono text-xs text-slate-500 flex flex-col gap-2">
          <span>─── [ 관찰 및 집착 ] ──▶</span>
          <span>◀── [ 경계 및 의존 ] ───</span>
        </div>
        <div className="w-32 h-32 rounded-full bg-white border-2 border-slate-400 flex items-center justify-center font-bold">캐릭터 B</div>
      </div>
      <p className="text-sm text-slate-600 max-w-lg mx-auto">두 사람의 서사나 첫 만남, 혐관에서 쌍방이 되는 과정 등을 자유롭게 적어보세요.</p>
    </div>
  );
}