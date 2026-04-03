import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  User, 
  LogOut, 
  Moon, 
  Sun, 
  MessageSquare, 
  Info, 
  Save, 
  History,
  Sparkles,
  Book,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp 
} from './firebase';
import { getVerseAnalysis } from './services/geminiService';
import { VerseData, WordAnalysis, UserTranslation, VerseNote } from './types';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';

const TORAH_BOOKS = [
  { name: 'Génesis', english: 'Genesis', chapters: 50 },
  { name: 'Éxodo', english: 'Exodus', chapters: 40 },
  { name: 'Levítico', english: 'Leviticus', chapters: 27 },
  { name: 'Números', english: 'Numbers', chapters: 36 },
  { name: 'Deuteronomio', english: 'Deuteronomy', chapters: 34 }
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Navigation State
  const [currentBook, setCurrentBook] = useState(TORAH_BOOKS[0]);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentVerse, setCurrentVerse] = useState(1);
  
  // Data State
  const [verseData, setVerseData] = useState<VerseData | null>(null);
  const [fetchingVerse, setFetchingVerse] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordAnalysis | null>(null);
  
  // User Content State
  const [userTranslation, setUserTranslation] = useState('');
  const [userNote, setUserNote] = useState('');
  const [savedTranslation, setSavedTranslation] = useState<UserTranslation | null>(null);
  const [savedNote, setSavedNote] = useState<VerseNote | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchVerse();
  }, [currentBook, currentChapter, currentVerse]);

  useEffect(() => {
    if (!user) return;
    
    // Listen for user translation
    const tQuery = query(
      collection(db, 'translations'),
      where('userId', '==', user.uid),
      where('book', '==', currentBook.name),
      where('chapter', '==', currentChapter),
      where('verse', '==', currentVerse)
    );
    
    const unsubscribeT = onSnapshot(tQuery, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() as UserTranslation;
        setSavedTranslation({ ...data, id: doc.id });
        setUserTranslation(data.translation);
      } else {
        setSavedTranslation(null);
        setUserTranslation('');
      }
    });

    // Listen for user note
    const nQuery = query(
      collection(db, 'notes'),
      where('userId', '==', user.uid),
      where('book', '==', currentBook.name),
      where('chapter', '==', currentChapter),
      where('verse', '==', currentVerse)
    );
    
    const unsubscribeN = onSnapshot(nQuery, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data() as VerseNote;
        setSavedNote({ ...data, id: doc.id });
        setUserNote(data.content);
      } else {
        setSavedNote(null);
        setUserNote('');
      }
    });

    return () => {
      unsubscribeT();
      unsubscribeN();
    };
  }, [user, currentBook, currentChapter, currentVerse]);

  const fetchVerse = async () => {
    setFetchingVerse(true);
    try {
      const data = await getVerseAnalysis(currentBook.english, currentChapter, currentVerse);
      setVerseData(data);
      setSelectedWord(null);
    } catch (error) {
      console.error("Error fetching verse:", error);
    } finally {
      setFetchingVerse(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const tId = savedTranslation?.id || `${user.uid}_${currentBook.name}_${currentChapter}_${currentVerse}_t`;
      await setDoc(doc(db, 'translations', tId), {
        userId: user.uid,
        book: currentBook.name,
        chapter: currentChapter,
        verse: currentVerse,
        translation: userTranslation,
        updatedAt: serverTimestamp()
      }, { merge: true });

      const nId = savedNote?.id || `${user.uid}_${currentBook.name}_${currentChapter}_${currentVerse}_n`;
      await setDoc(doc(db, 'notes', nId), {
        userId: user.uid,
        book: currentBook.name,
        chapter: currentChapter,
        verse: currentVerse,
        content: userNote,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving content:", error);
    } finally {
      setSaving(false);
    }
  };

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      {/* Header */}
      <header className={cn(
        "h-16 border-b flex items-center justify-between px-6 sticky top-0 z-50 backdrop-blur-md",
        darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-3">
            <img 
              src="https://raw.githubusercontent.com/priicarpalarcon/KetuvBeIvrit/main/logo.png" 
              alt="Logo" 
              className="h-10 w-auto"
              onError={(e) => {
                // Fallback if logo fails to load
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/hebrew/100/100";
              }}
            />
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent hidden sm:block">
              Ketuv BeIvrit Traductor
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {user ? (
            <div className="flex items-center gap-3">
              <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-amber-500" />
              <button onClick={logout} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
            >
              <User size={18} />
              <span>Ingresar</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className={cn(
                "w-72 border-r flex flex-col overflow-y-auto",
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="p-4 space-y-6">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Book size={14} /> Libros de la Torah
                  </h3>
                  <div className="space-y-1">
                    {TORAH_BOOKS.map(book => (
                      <button
                        key={book.name}
                        onClick={() => {
                          setCurrentBook(book);
                          setCurrentChapter(1);
                          setCurrentVerse(1);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all text-sm",
                          currentBook.name === book.name 
                            ? "bg-amber-600/20 text-amber-500 font-medium border border-amber-600/30" 
                            : "hover:bg-slate-800 text-slate-400"
                        )}
                      >
                        {book.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ChevronRight size={14} /> Capítulo
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map(ch => (
                      <button
                        key={ch}
                        onClick={() => {
                          setCurrentChapter(ch);
                          setCurrentVerse(1);
                        }}
                        className={cn(
                          "aspect-square flex items-center justify-center rounded-md text-xs transition-all",
                          currentChapter === ch 
                            ? "bg-amber-600 text-white" 
                            : "bg-slate-800/50 hover:bg-slate-800 text-slate-400"
                        )}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Verse Selector */}
          <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-amber-500">
                {currentBook.name} {currentChapter}:{currentVerse}
              </h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentVerse(Math.max(1, currentVerse - 1))}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentVerse(currentVerse + 1)}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar raíz o palabra..."
                  className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-amber-500 transition-colors w-64"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Hebrew Text & Analysis */}
            <div className="space-y-6">
              <section className={cn(
                "p-8 rounded-2xl border shadow-xl min-h-[300px] flex flex-col justify-center relative overflow-hidden",
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-slate-500">
                  <BookOpen size={14} /> Texto Hebreo
                </div>
                
                {fetchingVerse ? (
                  <div className="flex flex-col items-center gap-4">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center"
                    >
                      <Sparkles className="text-amber-500" size={32} />
                    </motion.div>
                    <p className="text-slate-400 animate-pulse">Analizando texto sagrado...</p>
                  </div>
                ) : verseData ? (
                  <div className="text-right space-y-8" dir="rtl">
                    <div className="flex flex-wrap justify-end gap-x-4 gap-y-6">
                      {verseData.words.map((w, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.1 }}
                          onClick={() => setSelectedWord(w)}
                          className={cn(
                            "text-4xl font-serif transition-all relative group",
                            selectedWord?.word === w.word ? "text-amber-500" : "text-slate-200 hover:text-amber-400"
                          )}
                        >
                          {w.word}
                          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-sans opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 whitespace-nowrap" dir="ltr">
                            {w.transliteration}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-slate-500">Selecciona un versículo para comenzar.</p>
                )}
              </section>

              {/* Analysis Panel */}
              <AnimatePresence mode="wait">
                {selectedWord && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={cn(
                      "p-6 rounded-2xl border shadow-lg space-y-4",
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xl">
                          {selectedWord.word}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{selectedWord.transliteration}</h3>
                          <p className="text-xs text-slate-500">Pronunciación: {selectedWord.pronunciation}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium text-amber-500">
                        {selectedWord.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-slate-500 text-xs">Raíz (Shoresh)</p>
                        <p className="font-medium text-amber-400">{selectedWord.root}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-500 text-xs">Forma Léxica</p>
                        <p className="font-medium">{selectedWord.lexicalForm}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-500 text-xs">Morfología</p>
                        <p className="font-medium">{selectedWord.morphology}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-500 text-xs">Función Sintáctica</p>
                        <p className="font-medium">{selectedWord.function}</p>
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Translation & AI */}
            <div className="space-y-6">
              {/* User Translation Area */}
              <section className={cn(
                "p-6 rounded-2xl border shadow-lg space-y-4",
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <FileText size={18} className="text-amber-500" /> Tu Traducción
                  </h3>
                  <div className="flex items-center gap-2">
                    {savedTranslation && (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <History size={10} /> Guardado
                      </span>
                    )}
                    <button 
                      onClick={() => {
                        const content = `Traducción de ${currentBook.name} ${currentChapter}:${currentVerse}\n\nOriginal: ${verseData?.hebrewText}\n\nTu Traducción: ${userTranslation}\n\nNotas: ${userNote}\n\nSugerencia IA: ${verseData?.aiTranslation}`;
                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${currentBook.name}_${currentChapter}_${currentVerse}.txt`;
                        a.click();
                      }}
                      className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
                      title="Exportar como TXT"
                    >
                      <History size={16} />
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={!user || saving}
                      className="p-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                </div>
                
                <textarea 
                  value={userTranslation}
                  onChange={(e) => setUserTranslation(e.target.value)}
                  placeholder={user ? "Escribe tu traducción aquí..." : "Ingresa para guardar tus traducciones"}
                  disabled={!user}
                  className="w-full h-32 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare size={14} /> Notas Personales
                  </h4>
                  <textarea 
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="Anotaciones gramaticales o teológicas..."
                    disabled={!user}
                    className="w-full h-24 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  />
                </div>
              </section>

              {/* AI Suggestions */}
              <section className={cn(
                "p-6 rounded-2xl border shadow-lg space-y-4 relative overflow-hidden",
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              )}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles size={80} className="text-amber-500" />
                </div>
                
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" /> Sugerencia de IA
                </h3>

                {fetchingVerse ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-slate-800 rounded w-1/2 animate-pulse" />
                  </div>
                ) : verseData ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                      <p className="text-amber-200 italic">"{verseData.aiTranslation}"</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Info size={14} /> Explicación Contextual
                      </h4>
                      <div className="text-sm text-slate-400 leading-relaxed prose prose-invert prose-amber max-w-none">
                        <ReactMarkdown>{verseData.aiExplanation}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Cargando sugerencias...</p>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Footer / Status Bar */}
      <footer className={cn(
        "h-8 border-t px-4 flex items-center justify-between text-[10px] text-slate-500",
        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}>
        <div className="flex items-center gap-4">
          <span>Ketuv BeIvrit v1.0</span>
          <span>•</span>
          <span>Basado en el Códice de Leningrado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", user ? "bg-green-500" : "bg-slate-700")} />
          <span>{user ? `Conectado como ${user.displayName}` : "Modo Invitado"}</span>
        </div>
      </footer>
    </div>
  );
}
