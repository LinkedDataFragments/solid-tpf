import gulp from 'gulp';
import babel from 'gulp-babel';

gulp.task('default', ['build'], () => {
  gulp.watch('src/**/*.js', ['build']);
});

gulp.task('build', () => {
  return gulp.src('src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('lib'));
});
