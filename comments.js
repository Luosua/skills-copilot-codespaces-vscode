// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');
// Create Express application
const app = express();
// Enable cross-origin resource sharing
app.use(cors());
// Enable body parser
app.use(bodyParser.json());
// Create comments object
const commentsByPostId = {};
// Create route to get comments by post id
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});
// Create route to post comments by post id
app.post('/posts/:id/comments', async (req, res) => {
    // Generate random id
    const commentId = randomBytes(4).toString('hex');
    // Get content and status
    const { content, status } = req.body;
    // Get comments by post id
    const comments = commentsByPostId[req.params.id] || [];
    // Push new comment
    comments.push({ id: commentId, content, status });
    // Set comments by post id
    commentsByPostId[req.params.id] = comments;
    // Emit event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            status,
            postId: req.params.id
        }
    });
    // Send response
    res.status(201).send(comments);
});
// Create route to post events
app.post('/events', async (req, res) => {
    // Get event
    const { type, data } = req.body;
    // Log event
    console.log('Event Received:', type);
    // Check if event type is CommentModerated
    if (type === 'CommentModerated') {
        // Get id, postId, status, content
        const { id, postId, status, content } = data;
        // Get comments by post id
        const comments = commentsByPostId[postId];
        // Find comment
        const comment = comments.find(comment => {
            return comment.id === id;
        });
        // Set status
        comment.status = status;
        // Emit event to event bus
        await axios.post('http://event-bus-srv:4005