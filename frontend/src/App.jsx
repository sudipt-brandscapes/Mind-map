import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Paper,
 IconButton,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  Description,
  Psychology,
  Send,
  Download,
  ExpandMore,
  ExpandLess,
  Settings
} from '@mui/icons-material';
import axios from 'axios';
import MindMapVisualization from './components/MindMapVisualization';

const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [file, setFile] = useState(null);
  const [llamaApiKey, setLlamaApiKey] = useState('');
  const [mindMapData, setMindMapData] = useState(null);
  const [stats, setStats] = useState(null);
  const [textSample, setTextSample] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nodePath, setNodePath] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file first');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    if (llamaApiKey) {
      formData.append('llama_api_key', llamaApiKey);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/upload-pdf/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setMindMapData(response.data.mindmap);
        setStats(response.data.stats);
        setTextSample(response.data.text_sample);
      } else {
        setError(response.data.error || 'Failed to process PDF');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload and process PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = (path, generatedQuestion) => {
    setNodePath(path);
    setQuestion(generatedQuestion);
  };

  const handleAskQuestion = async () => {
    if (!question || !textSample) {
      setError('Please provide a question and ensure a PDF has been processed');
      return;
    }

    setQuestionLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/ask-question/`, {
        context: textSample,
        question: question,
      });

      if (response.data.success) {
        setAnswer(response.data.answer);
      } else {
        setError(response.data.error || 'Failed to get answer');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to ask question');
    } finally {
      setQuestionLoading(false);
    }
  };

  const downloadMindMap = () => {
    if (!mindMapData) return;
    
    const dataStr = JSON.stringify(mindMapData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'mindmap.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#0d1117',
      color: '#f0f6fc'
    }}>
      {/* Header */}
      <Box sx={{ 
        borderBottom: '1px solid #30363d',
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Psychology sx={{ fontSize: 32, color: '#58a6ff' }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#f0f6fc' }}>
            Mind Map Studio
          </Typography>
        </Box>
        
        <IconButton 
          onClick={() => setShowSettings(!showSettings)}
          sx={{ color: '#8b949e' }}
        >
          <Settings />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
        {/* Sidebar */}
        <Box sx={{ 
          width: 400,
          borderRight: '1px solid #30363d',
          p: 3,
          overflowY: 'auto',
          backgroundColor: '#0d1117'
        }}>
          {/* Settings Panel */}
          {showSettings && (
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              backgroundColor: '#161b22',
              border: '1px solid #30363d'
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#f0f6fc' }}>
                Configuration
              </Typography>
              <TextField
                fullWidth
                label="LlamaParse API Key"
                type="password"
                value={llamaApiKey}
                onChange={(e) => setLlamaApiKey(e.target.value)}
                size="small"
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#0d1117',
                    '& fieldset': { borderColor: '#30363d' },
                    '&:hover fieldset': { borderColor: '#58a6ff' },
                    '&.Mui-focused fieldset': { borderColor: '#58a6ff' }
                  },
                  '& .MuiInputLabel-root': { color: '#8b949e' },
                  '& .MuiInputBase-input': { color: '#f0f6fc' }
                }}
              />
              <Typography variant="caption" sx={{ color: '#8b949e' }}>
                For enhanced extraction of complex documents
              </Typography>
            </Paper>
          )}

          {/* Upload Section */}
          <Paper sx={{ 
            p: 3, 
            mb: 3, 
            backgroundColor: '#161b22',
            border: '1px solid #30363d'
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#f0f6fc' }}>
              Upload Document
            </Typography>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              startIcon={<Description />}
              fullWidth
              sx={{ 
                mb: 2,
                borderColor: '#30363d',
                color: '#f0f6fc',
                '&:hover': {
                  borderColor: '#58a6ff',
                  backgroundColor: 'rgba(88, 166, 255, 0.1)'
                }
              }}
            >
              Select PDF File
            </Button>
            
            {file && (
              <Chip 
                label={file.name} 
                sx={{ 
                  mb: 2,
                  backgroundColor: '#58a6ff',
                  color: '#ffffff',
                  maxWidth: '100%'
                }} 
              />
            )}

            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!file || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
              fullWidth
              sx={{ 
                backgroundColor: '#238636',
                '&:hover': { backgroundColor: '#2ea043' },
                '&:disabled': { backgroundColor: '#30363d' }
              }}
            >
              {loading ? 'Processing...' : 'Generate Mind Map'}
            </Button>
          </Paper>

          {/* Stats */}
          {stats && (
            <Paper sx={{ 
              p: 3, 
              mb: 3, 
              backgroundColor: '#161b22',
              border: '1px solid #30363d'
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#f0f6fc' }}>
                Document Stats
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#8b949e' }}>Characters:</Typography>
                  <Typography variant="body2" sx={{ color: '#f0f6fc' }}>
                    {stats.total_characters.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#8b949e' }}>Chunks:</Typography>
                  <Typography variant="body2" sx={{ color: '#f0f6fc' }}>
                    {stats.number_of_chunks}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#8b949e' }}>Type:</Typography>
                  <Chip 
                    label={stats.is_complex ? "Complex" : "Simple"}
                    size="small"
                    sx={{ 
                      backgroundColor: stats.is_complex ? '#da3633' : '#238636',
                      color: '#ffffff'
                    }}
                  />
                </Box>
              </Box>
            </Paper>
          )}

          {/* Question Section */}
          {mindMapData && (
            <Paper sx={{ 
              p: 3, 
              backgroundColor: '#161b22',
              border: '1px solid #30363d'
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#f0f6fc' }}>
                Ask Questions
              </Typography>
              
              {nodePath && (
                <TextField
                  fullWidth
                  label="Node Path"
                  value={nodePath}
                  size="small"
                  disabled
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#0d1117',
                      '& fieldset': { borderColor: '#30363d' }
                    },
                    '& .MuiInputLabel-root': { color: '#8b949e' },
                    '& .MuiInputBase-input': { color: '#8b949e' }
                  }}
                />
              )}
              
              <TextField
                fullWidth
                label="Your Question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                multiline
                rows={3}
                size="small"
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#0d1117',
                    '& fieldset': { borderColor: '#30363d' },
                    '&:hover fieldset': { borderColor: '#58a6ff' },
                    '&.Mui-focused fieldset': { borderColor: '#58a6ff' }
                  },
                  '& .MuiInputLabel-root': { color: '#8b949e' },
                  '& .MuiInputBase-input': { color: '#f0f6fc' }
                }}
              />
              
              <Button
                variant="contained"
                onClick={handleAskQuestion}
                disabled={questionLoading || !question}
                startIcon={questionLoading ? <CircularProgress size={20} /> : <Send />}
                fullWidth
                sx={{ 
                  mb: 2,
                  backgroundColor: '#58a6ff',
                  '&:hover': { backgroundColor: '#4c8df5' },
                  '&:disabled': { backgroundColor: '#30363d' }
                }}
              >
                {questionLoading ? 'Getting Answer...' : 'Ask'}
              </Button>
              
              {answer && (
                <Paper sx={{ 
                  p: 2, 
                  backgroundColor: '#0d1117',
                  border: '1px solid #30363d'
                }}>
                  <Typography variant="body2" sx={{ 
                    color: '#f0f6fc',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6
                  }}>
                    {answer}
                  </Typography>
                </Paper>
              )}
            </Paper>
          )}
        </Box>

        {/* Main Content */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0d1117'
        }}>
          {/* Mind Map Header */}
          {mindMapData && (
            <Box sx={{ 
              p: 3,
              borderBottom: '1px solid #30363d',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6" sx={{ color: '#f0f6fc' }}>
                Interactive Mind Map
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowJson(!showJson)}
                  startIcon={showJson ? <ExpandLess /> : <ExpandMore />}
                  sx={{ 
                    borderColor: '#30363d',
                    color: '#8b949e',
                    '&:hover': { borderColor: '#58a6ff', color: '#58a6ff' }
                  }}
                >
                  JSON
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={downloadMindMap}
                  startIcon={<Download />}
                  sx={{ 
                    borderColor: '#30363d',
                    color: '#8b949e',
                    '&:hover': { borderColor: '#58a6ff', color: '#58a6ff' }
                  }}
                >
                  Export
                </Button>
              </Box>
            </Box>
          )}

          {/* JSON Viewer */}
          {showJson && mindMapData && (
            <Box sx={{ 
              p: 3,
              borderBottom: '1px solid #30363d',
              maxHeight: 300,
              overflow: 'auto',
              backgroundColor: '#161b22'
            }}>
              <pre style={{ 
                color: '#8b949e',
                fontSize: '12px',
                margin: 0,
                fontFamily: 'Monaco, Consolas, monospace'
              }}>
                {JSON.stringify(mindMapData, null, 2)}
              </pre>
            </Box>
          )}

          {/* Mind Map Visualization */}
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {mindMapData ? (
              <MindMapVisualization 
                data={mindMapData} 
                onNodeClick={handleNodeClick}
              />
            ) : (
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#8b949e'
              }}>
                <Psychology sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  No Mind Map Generated
                </Typography>
                <Typography variant="body2">
                  Upload a PDF document to get started
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            position: 'fixed',
            bottom: 20,
            right: 20,
            backgroundColor: '#da3633',
            color: '#ffffff'
          }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
}

export default App;