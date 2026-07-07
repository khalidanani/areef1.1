import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Book, ChevronLeft, ChevronDown, CheckCircle, X, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AIExtractor from './AIExtractor';
import NotificationsBell from './NotificationsBell';

export default function CurriculumBank() {
  const [books, setBooks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [questions, setQuestions] = useState([]);
  
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIExtractor, setShowAIExtractor] = useState(false);

  useEffect(() => {
    fetchBooks();
    const cid = searchParams.get('classId');
    if (cid) setSelectedClassId(cid);
  }, [searchParams]);

  async function fetchBooks() {
    setLoading(true);
    try {
      const { data: booksData } = await supabase.from('books').select('*');
      
      let purchasedIds = [];
      if (user) {
        const { data: purchases } = await supabase.from('teacher_book_purchases').select('book_id').eq('teacher_id', user.id);
        if (purchases) purchasedIds = purchases.map(p => p.book_id);
      }

      if (booksData) {
        const availableBooks = booksData.filter(b => b.is_free || purchasedIds.includes(b.id));
        setBooks(availableBooks);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  async function fetchChapters(bookId) {
    const { data } = await supabase.from('chapters').select('*').eq('book_id', bookId).order('chapter_order');
    if (data) setChapters(data);
  }

  async function fetchLessons(chapterId) {
    const { data } = await supabase.from('lessons').select('*').eq('chapter_id', chapterId).order('lesson_order');
    if (data) setLessons(data);
  }

  async function fetchQuestions(lessonId) {
    const { data } = await supabase.from('questions').select('*').eq('lesson_id', lessonId);
    if (data) setQuestions(data);
  }

  const parseOptions = (options) => {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    try {
      if (typeof options === 'string') {
        const parsed = JSON.parse(options);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn("Failed to parse options:", options);
    }
    return [];
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setSelectedLesson(null);
    setQuestions([]);
    fetchChapters(book.id);
  };

  const handleChapterClick = (chapter) => {
    setSelectedChapter(chapter);
    setSelectedLesson(null);
    setQuestions([]);
    fetchLessons(chapter.id);
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    fetchQuestions(lesson.id);
  };

  const toggleQuestion = (questionId) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(questionId)) newSet.delete(questionId);
    else newSet.add(questionId);
    setSelectedQuestions(newSet);
  };

  const handleAssignClick = async () => {
    const { data } = await supabase.from('classes').select('id, name').eq('teacher_id', user.id);
    if (data) setTeacherClasses(data);
    setShowAssignModal(true);
  };

  const submitHomework = async () => {
    if (!selectedClassId || !homeworkTitle) return alert('الرجاء إدخال عنوان الواجب واختيار الفصل');
    setIsSubmitting(true);
    
    const { data: hwData, error: hwError } = await supabase.from('homeworks').insert({
      class_id: selectedClassId,
      title: homeworkTitle
    }).select();

    if (hwError || !hwData) {
      alert('حدث خطأ أثناء إنشاء الواجب');
      setIsSubmitting(false);
      return;
    }

    const homeworkId = hwData[0].id;

    const questionsToInsert = Array.from(selectedQuestions).map(qId => ({
      homework_id: homeworkId,
      question_id: qId
    }));

    await supabase.from('homework_questions').insert(questionsToInsert);
    
    // Notify students
    const { data: enrollments } = await supabase.from('class_enrollments').select('student_id').eq('class_id', selectedClassId);
    if (enrollments && enrollments.length > 0) {
      const notifications = enrollments.map(e => ({
        user_id: e.student_id,
        title: 'واجب جديد! 📝',
        message: `تم تكليفك بواجب جديد: ${homeworkTitle}`
      }));
      await supabase.from('notifications').insert(notifications);
    }
    
    alert('تم إرسال الواجب بنجاح!');
    setShowAssignModal(false);
    setSelectedQuestions(new Set());
    setHomeworkTitle('');
    navigate('/teacher-dashboard');
  };

  return (
    <div className="container-fluid flex-grow-1 container-p-y">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold py-1 mb-1">
            <span className="text-muted fw-light">الرئيسية /</span> بنك المناهج
          </h4>
          <p className="text-muted mb-0">تصفح المناهج واختر الأسئلة لإنشاء الواجبات بضغطة زر</p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <NotificationsBell />
          {selectedQuestions.size > 0 && (
            <button onClick={handleAssignClick} className="btn btn-primary shadow-sm">
              <i className="ti tabler-send me-1"></i> تعيين كواجب ({selectedQuestions.size} أسئلة)
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
        </div>
      ) : (
        <div className="row">
          
          <div className="col-lg-4 col-md-5 mb-4">
            <div className="card h-100">
              <div className="card-header border-bottom">
                <h5 className="card-title mb-0">المقررات الدراسية</h5>
              </div>
              <div className="card-body p-0">
                {books.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    <p>لا توجد مناهج متاحة لك حالياً.</p>
                    <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => navigate('/store')}>
                      الذهاب للمتجر لشراء المناهج
                    </button>
                  </div>
                ) : (
                  <ul className="list-group list-group-flush rounded-0">
                  {books.map(book => (
                    <li key={book.id} className="list-group-item border-0 p-3 pb-0">
                      <button 
                        onClick={() => handleBookClick(book)}
                        className={`btn w-100 d-flex justify-content-between align-items-center ${selectedBook?.id === book.id ? 'btn-primary' : 'btn-outline-secondary border-0 text-start'}`}
                      >
                        <span className="d-flex align-items-center gap-2">
                          <i className="ti tabler-book"></i> {book.title}
                        </span>
                        <i className={`ti ${selectedBook?.id === book.id ? 'tabler-chevron-down' : 'tabler-chevron-left'}`}></i>
                      </button>
                      
                      {selectedBook?.id === book.id && (
                        <ul className="list-group list-group-flush mt-2 pe-3 border-end">
                          {chapters.map(chapter => (
                            <li key={chapter.id} className="list-group-item border-0 p-1">
                              <button 
                                onClick={() => handleChapterClick(chapter)}
                                className={`btn btn-sm w-100 text-start fw-semibold ${selectedChapter?.id === chapter.id ? 'text-primary' : 'text-muted'}`}
                              >
                                {chapter.chapter_order}- {chapter.title}
                              </button>
                              
                              {selectedChapter?.id === chapter.id && (
                                <ul className="list-group list-group-flush mt-1 pe-3 border-end border-light">
                                  {lessons.map(lesson => (
                                    <li key={lesson.id} className="list-group-item border-0 p-1">
                                      <button 
                                        onClick={() => handleLessonClick(lesson)}
                                        className={`btn btn-sm w-100 text-start d-flex align-items-center gap-2 ${selectedLesson?.id === lesson.id ? 'text-primary fw-bold' : 'text-muted'}`}
                                      >
                                        <i className="ti tabler-point fs-6"></i>
                                        {lesson.title}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-8 col-md-7">
            <div className="card h-100">
              {selectedLesson ? (
                <>
                  <div className="card-header d-flex justify-content-between align-items-center border-bottom">
                    <h5 className="card-title mb-0">أسئلة الدرس: {selectedLesson.title}</h5>
                    <button 
                      onClick={() => setShowAIExtractor(true)}
                      className="btn btn-sm btn-warning fw-bold d-flex align-items-center gap-2"
                    >
                      <i className="ti tabler-sparkles"></i> استخراج أسئلة من صورة
                    </button>
                  </div>
                  
                  <div className="card-body pt-4">
                    {questions.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="ti tabler-book-2 text-muted fs-1 mb-3 opacity-50"></i>
                        <p className="text-muted mb-4">لا توجد أسئلة مضافة لهذا الدرس حتى الآن.</p>
                        <button 
                          onClick={() => setShowAIExtractor(true)}
                          className="btn btn-warning fw-bold d-inline-flex align-items-center gap-2"
                        >
                          <i className="ti tabler-sparkles"></i> استخدم الذكاء الاصطناعي لإضافة أسئلة الآن!
                        </button>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {questions.map(q => {
                          const isSelected = selectedQuestions.has(q.id);
                          return (
                            <div 
                              key={q.id} 
                              onClick={() => toggleQuestion(q.id)}
                              className={`card border cursor-pointer transition-all position-relative ${isSelected ? 'border-primary bg-label-primary' : 'border-light hover-border-primary'}`}
                            >
                              {isSelected && <i className="ti tabler-circle-check-filled text-primary fs-3 position-absolute top-0 start-0 m-3"></i>}
                              
                              <div className="card-body">
                                <div className="d-flex gap-2 mb-3">
                                  <span className="badge bg-label-secondary">{q.question_type}</span>
                                  <span className={`badge ${q.difficulty_level === 'سهل' ? 'bg-label-success' : q.difficulty_level === 'متوسط' ? 'bg-label-warning' : 'bg-label-danger'}`}>
                                    {q.difficulty_level}
                                  </span>
                                </div>
                                
                                <p className="fs-5 fw-semibold mb-3 text-heading">
                                  {q.question_text}
                                </p>
                                
                                {(q.page_number || q.exercise_number) && (
                                  <div className="d-flex gap-3 mb-3 text-muted small">
                                    {q.page_number && <span><i className="ti tabler-file-text me-1"></i> صفحة: {q.page_number}</span>}
                                    {q.exercise_number && <span><i className="ti tabler-pencil me-1"></i> تمرين: {q.exercise_number}</span>}
                                  </div>
                                )}
                                
                                {q.options && parseOptions(q.options).length > 0 && (
                                  <div className="row g-2 mb-3">
                                    {parseOptions(q.options).map((opt, i) => (
                                      <div key={i} className="col-6">
                                        <div className="p-2 border rounded text-center bg-lighter">
                                          {opt}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div className="p-3 bg-lighter rounded mt-3 border-start border-3 border-primary">
                                  <strong className="text-heading">الإجابة النموذجية (لعريف):</strong> {q.correct_answer}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted p-5">
                  <i className="ti tabler-book-2 fs-1 mb-3 opacity-25"></i>
                  <p>الرجاء اختيار الدرس من القائمة الجانبية لاستعراض الأسئلة</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      )}

      {showAssignModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-primary fw-bold">تعيين الواجب</h5>
                <button type="button" className="btn-close" onClick={() => setShowAssignModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-bold">عنوان الواجب</label>
                  <input 
                    type="text" 
                    className="form-control"
                    value={homeworkTitle}
                    onChange={e => setHomeworkTitle(e.target.value)}
                    placeholder="مثال: واجب الدرس الأول - الجبر"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold">اختر الفصل</label>
                  <select 
                    className="form-select"
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                  >
                    <option value="" disabled>-- اختر الفصل --</option>
                    {teacherClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={submitHomework}
                  disabled={isSubmitting}
                  className="btn btn-primary w-100" 
                >
                  {isSubmitting ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> جاري الإرسال...</>
                  ) : 'إرسال الواجب للفصل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAIExtractor && (
        <AIExtractor 
          lesson={selectedLesson} 
          onClose={() => {
            setShowAIExtractor(false);
            fetchQuestions(selectedLesson.id); 
          }} 
        />
      )}
    </div>
  );
}
