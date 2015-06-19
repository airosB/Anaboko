
path = require 'path'
basePath = __dirname
baseName = path.basename(basePath)
devHttpPath = "/#{baseName}"



# -------------------------------------------------
# プラグインロード
# -------------------------------------------------
# 基本
gulp             = require 'gulp'
gutil            = require 'gulp-util'
filter           = require 'gulp-filter'
rename           = require 'gulp-rename'

# watch関連
watch            = require 'gulp-watch'
plumber          = require 'gulp-plumber'
notify           = require 'gulp-notify'
cached           = require 'gulp-cached'

# Sass/Coffeeコンパイル関連
sass             = require 'gulp-sass'
postcss          = require 'gulp-postcss'
autoprefixer     = require 'autoprefixer-core'
mqpacker         = require 'css-mqpacker'
coffee           = require 'gulp-coffee'
sourcemaps       = require 'gulp-sourcemaps'

# タスクの逐次実行
runSequence      = require 'run-sequence'
# bower_componentsの取得
mainBowerFiles   = require 'main-bower-files'
# 外部プログラムの実行
exec             = require 'gulp-exec'






# -------------------------------------------------
# SassとCoffeeを監視・コンパイルする
# -------------------------------------------------
gulp.task 'default', ['watch']
gulp.task 'watch', (callback)->

	# 初回コンパイル実行
	gulp.start 'sass'
	gulp.start 'coffee'

	# importされないscssのwatch
	gulp
		.watch ['sass/**/*.scss'], ['sass']
		.on 'change', (event)->
			console.log "#{event.type} - #{event.path}"

	# coffeeのwatch
	gulp
		.watch 'coffee/**/*.coffee', ['coffee']
		.on 'change', (event)->
			console.log "#{event.type} - #{event.path}"


# -------------------------------------------------
# Sassコンパイル
# -------------------------------------------------
gulp.task 'scss', ['sass']
gulp.task 'sass', (path) ->
	gulp
		.src 'sass/**/*.scss'
		.pipe plumber
			errorHandler: notify.onError
				title: 'Sass: <%= error.name %>'
				message: '<%= error.message %>'
		.pipe sourcemaps.init()
		.pipe sass
			imagePath: "#{devHttpPath}/img"
			# 'compressed', 'expanded', 'compact', 'nested'
			outputStyle: 'nested'
			sourceComments: true
			includePaths: ['sass', 'sass/lib']
		.pipe postcss [
			autoprefixer
				browsers: ['> 1%', 'last 2 versions', 'IE 9', 'Firefox ESR', 'Opera 12.1']
			mqpacker
		]
		.pipe sourcemaps.write()
		.pipe gulp.dest 'css'




# -------------------------------------------------
# Coffeeコンパイル
# -------------------------------------------------
gulp.task 'coffee', ->
	gulp
		.src 'coffee/**/*.coffee'
		.pipe cached 'coffee'
		.pipe plumber
			errorHandler: notify.onError
				title: 'Coffee: <%= error.name %>'
				message: '<%= error.message %>'
		.pipe sourcemaps.init()
		.pipe coffee
			bare: true
		.on 'error', gutil.log
		.pipe sourcemaps.write()
		.pipe gulp.dest 'js'




# -------------------------------------------------
# Bowerを使った初期化
# -------------------------------------------------
gulp.task 'initialize', ['init']
gulp.task 'init', (callback)->
	runSequence(
		'bowerInstall',
		'exportLib',
		callback
	)



# -------------------------------------------------
# Bower installの実行
# -------------------------------------------------
gulp.task 'bower', ['bowerInstall']
gulp.task 'bowerInstall', ->
	gulp
		# ダミーストリーム
		.src 'gulpfile.coffee'
		.pipe exec 'bower install'
		.pipe exec.reporter()


# -------------------------------------------------
# Bowerのexport
# -------------------------------------------------
gulp.task 'exportLib', ->
	gulp
		.src mainBowerFiles(),
			base: 'bower_components'
		.pipe filter ['**/*', '!**/*.scss']
		.pipe rename (path)->
			# 無駄なディレクトリ dist を除去する
			path.dirname = path.dirname.replace(/[\\\/]dist/, '')
			path
		.pipe gulp.dest 'jslib'


