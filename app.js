require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');


const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const protectedRouter = require('./routes/protected');
const jobPostingsRouter = require('./routes/jobPostings');
const candidatesRouter = require('./routes/candidates');
const candidateNotesRouter = require('./routes/candidateNotes');
const bodyParser = require('body-parser');
const profileRouter = require('./routes/profile');
const uploadRoutes = require('./routes/upload'); 
const statisticsRoute = require('./routes/statistics');



const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));


app.use(
    session({
        secret: 'superlongtajna', // Secret for session signing
        resave: false,            // Avoid resaving unchanged sessions
        saveUninitialized: true,  // Save uninitialized sessions
        cookie: { secure: false } // Secure should be true if using HTTPS
    })
);

// Middleware za flash poruke
app.use(flash());

// Middleware za prosljeđivanje flash poruka u view-ove
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});


// Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/protected', protectedRouter);
app.use('/job-postings', jobPostingsRouter);
app.use('/candidates', candidatesRouter);
app.use('/candidate-notes', candidateNotesRouter);
app.use('/profile', profileRouter);
app.use('/uploads', express.static('public/uploads'));
app.use('/', uploadRoutes);
app.use('/statistics', statisticsRoute);



// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
