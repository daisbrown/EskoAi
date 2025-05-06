// src/App.js (Handling Multiple Chart.js Types)

import React, { useState, useEffect, useRef } from 'react';
import './App.css';
// import BarChart from './BarChart'; // <-- REMOVE this import

// --- IMPORT CHART.JS and COMPONENTS ---
import { Bar, Pie } from 'react-chartjs-2'; // Import Pie AND Bar
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // <-- IMPORT ArcElement for Pie charts
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// --- REGISTER CHART.JS ELEMENTS ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // <-- REGISTER ArcElement
  Title,
  Tooltip,
  Legend
);
// --- END CHART.JS IMPORTS/REGISTRATION ---


// Function to generate a simple unique ID
function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Regex to find chart JSON
const graphJsonRegex = /```json\s*(\{[\s\S]*?\})\s*```/;

function App() {
  // --- State Hooks ---
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]); // Array of { sender: 'user'/'ai', text: '...', graph: object | null }
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const textAreaRef = useRef(null);

  // --- N8N Webhook URL ---
  const n8nWebhookUrl = "https://10.250.241.12:5678/webhook/39278d4e-8a45-4f0b-bbee-ea06a0f05e0e"; // Your URL

  // --- Effects ---
  useEffect(() => {
    setSessionId(generateSessionId());
    setMessages([{ sender: 'ai', text: 'Hello! How can I assist you today?', graph: null }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const scrollHeight = textAreaRef.current.scrollHeight;
      const maxHeight = 100;
      textAreaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textAreaRef.current.style.overflowY = scrollHeight > maxHeight ? 'scroll' : 'hidden';
    }
  }, [inputValue]);

  // --- Handlers ---
  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  // *** THIS IS THE UPDATED FUNCTION WITH ADAPTATION LOGIC FOR MULTIPLE TYPES ***
  const handleSendMessage = async () => {
    const userMessageText = inputValue.trim();
    if (!userMessageText || isLoading) return;

    const newUserMessage = { sender: 'user', text: userMessageText, graph: null };
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    if (textAreaRef.current) {
       textAreaRef.current.style.height = 'auto';
       textAreaRef.current.style.overflowY = 'hidden';
    }


    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessageText, sessionId: sessionId }),
      });

      if (!response.ok) {
        let errorText = `HTTP error! status: ${response.status}`;
        try { const errorData = await response.json(); errorText = errorData.message || JSON.stringify(errorData); } catch (e) { try { errorText = await response.text(); } catch(e2) {} }
        throw new Error(errorText);
      }

      const responseData = await response.json();
      let aiResponseText = '';
      let graphData = null; // Will hold the formatted Chart.js data

      if (responseData && typeof responseData.text === 'string') {
         aiResponseText = responseData.text;
         const match = aiResponseText.match(graphJsonRegex);
         if (match && match[1]) {
             try {
                 const parsedJsonFromAI = JSON.parse(match[1]);
                 let chartJsData = null;
                 let adaptationSuccess = false; // Flag to track if adaptation worked

                 // --- Adaptation Logic ---
                 // Check if it looks like the AI's simplified format
                 if (Array.isArray(parsedJsonFromAI.labels) && (Array.isArray(parsedJsonFromAI.datasets) || Array.isArray(parsedJsonFromAI.values))) { // Look for labels and either datasets OR values (for pie)
                     const chartType = (parsedJsonFromAI.chartType || parsedJsonFromAI.type || 'bar').toLowerCase(); // Determine intended type

                     // Prepare base structure
                     const baseChartJsData = {
                         type: chartType, // Set the type for the switch later
                         data: {
                             labels: parsedJsonFromAI.labels,
                             datasets: []
                         },
                         options: { // Default options
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { display: true, position: 'top' }, title: { display: true } }
                         }
                     };

                     // Adapt datasets based on type
                     if (chartType === 'bar' && Array.isArray(parsedJsonFromAI.datasets)) {
                         baseChartJsData.data.datasets = parsedJsonFromAI.datasets;
                         // Add default title if missing
                         baseChartJsData.options.plugins.title.text = parsedJsonFromAI.datasets[0]?.label || 'Bar Chart';
                         // Add default scales for bar chart
                         baseChartJsData.options.scales = { y: { beginAtZero: true } };
                         chartJsData = baseChartJsData;
                         adaptationSuccess = true;
                         console.log("Adapting received JSON to Chart.js BAR chart format");
                     } else if (chartType === 'pie' && Array.isArray(parsedJsonFromAI.datasets)) {
                         // Handle case where AI gives datasets for pie (common)
                         baseChartJsData.data.datasets = parsedJsonFromAI.datasets;
                         baseChartJsData.options.plugins.title.text = parsedJsonFromAI.datasets[0]?.label || 'Pie Chart';
                         chartJsData = baseChartJsData;
                         adaptationSuccess = true;
                         console.log("Adapting received JSON (with datasets) to Chart.js PIE chart format");
                     } else if (chartType === 'pie' && Array.isArray(parsedJsonFromAI.values)) {
                         // Handle case where AI gives labels/values directly for pie (like plotly pie trace)
                         baseChartJsData.data.datasets = [{
                            data: parsedJsonFromAI.values,
                            // Add default colors if AI didn't provide them
                            backgroundColor: parsedJsonFromAI.backgroundColor || ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#FFCD56", "#C9CBCF"]
                         }];
                         baseChartJsData.options.plugins.title.text = parsedJsonFromAI.label || 'Pie Chart'; // Use label if provided, else default
                         chartJsData = baseChartJsData;
                         adaptationSuccess = true;
                         console.log("Adapting received JSON (with values) to Chart.js PIE chart format");
                     }
                     // Add more else if blocks here for other types (line, doughnut) if needed
                 }
                 // --- End Adaptation Logic ---


                 // Check if adaptation was successful
                 if (adaptationSuccess) {
                     graphData = chartJsData; // Assign the formatted data
                     aiResponseText = aiResponseText.replace(graphJsonRegex, "").trim();
                     aiResponseText = aiResponseText ? aiResponseText + "\n\n(See graph below)" : "Here is the graph you requested:";
                     console.log("Adapted/Formatted Chart.js data:", graphData);
                 } else {
                      // Check if it was ALREADY in the correct Chart.js format
                      if (parsedJsonFromAI.type && parsedJsonFromAI.data && parsedJsonFromAI.options) {
                          console.log("Received data already in Chart.js format.");
                          // Basic validation for structure
                          if (typeof parsedJsonFromAI.data === 'object' && Array.isArray(parsedJsonFromAI.data.datasets)) {
                              graphData = parsedJsonFromAI; // Use it directly
                              aiResponseText = aiResponseText.replace(graphJsonRegex, "").trim();
                              aiResponseText = aiResponseText ? aiResponseText + "\n\n(See graph below)" : "Here is the graph you requested:";
                          } else {
                              console.warn("Data was not in expected Chart.js format (missing data.datasets array). Ignoring graph.");
                              aiResponseText = responseData.text; // Keep original text
                              graphData = null;
                          }
                      } else {
                           // If not adaptable and not already correct format
                           console.warn("Parsed JSON did not match adaptable formats or Chart.js format. Ignoring graph.");
                           aiResponseText = responseData.text; // Keep original text
                           graphData = null;
                      }
                 }

             } catch (parseError) {
                 console.error("Failed to parse/adapt extracted JSON:", parseError);
                 aiResponseText = responseData.text; // Keep original text if parsing/adaptation fails
                 graphData = null; // Ensure graphData is null on error
             }
         }
      } else {
         console.warn("Received empty or unexpected response structure from N8N:", responseData);
         aiResponseText = "[AI response was empty or in an unexpected format]";
      }

      const newAiMessage = { sender: 'ai', text: aiResponseText, graph: graphData };
      setMessages(prevMessages => [...prevMessages, newAiMessage]);

    } catch (error) {
      console.error("Error sending/receiving message via N8N webhook:", error);
      const errorAiMessage = { sender: 'ai', text: `Sorry, I encountered an error. (${error.message})`, graph: null };
      setMessages(prevMessages => [...prevMessages, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  // --- END OF UPDATED handleSendMessage ---

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };


  // --- Render ---
  return (
    <div className="App">
      <header className="App-header">
        {/* Updated Title */}
        <span>EskoAi (Webhook Mode)</span>
        <div className="App-header-menu"> <div className="App-header-menu-middle"></div> </div>
      </header>

      <div className="Chat-area">
        {messages.map((msg, index) => (
          <div key={`${msg.sender}-${index}`} className={`message ${msg.sender}`}>
            <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.text}
            </div>

            {/* --- CONDITIONAL CHART RENDERING (Using Chart.js) --- */}
            {msg.graph && msg.graph.data && msg.graph.options && ( // Check basic structure
              <div className="graph-container" style={{ position: 'relative', height: '350px', width: '95%', margin: '15px auto' }}>
                 {(() => { // IIFE for clean logic
                     const chartOptions = msg.graph.options; // Already prepared during adaptation
                     const chartData = msg.graph.data; // Already prepared during adaptation

                     // Render based on type
                     switch (msg.graph.type?.toLowerCase()) {
                         case 'bar':
                             return <Bar options={chartOptions} data={chartData} />;
                         case 'pie':
                             return <Pie options={chartOptions} data={chartData} />;
                         // Add cases for 'line', 'doughnut', etc. here if needed
                         // case 'line': return <Line options={chartOptions} data={chartData} />;
                         default:
                             console.warn("Unsupported or missing chart type for rendering:", msg.graph.type);
                             return <div>Unsupported chart type: {msg.graph.type || 'Unknown'}</div>;
                     }
                 })()}
              </div>
            )}
            {/* --- END CONDITIONAL CHART RENDERING --- */}

          </div>
        ))}
        {isLoading && <div className="loading-indicator"><span>AI is thinking...</span></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="Input-area">
        <textarea
          ref={textAreaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          rows="1"
          disabled={isLoading}
        />
        <button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
          {/* Simple Send Icon Placeholder (CSS) */}
        </button>
      </div>
    </div>
  );
}

export default App;
