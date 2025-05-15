// Logout route
app.get('/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/auth/login');
}); 