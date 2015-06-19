###
# DeuteriumCIC baseline5 mod.0
# baseline1: only aligning / table rendering
# baseline2: calculating, analyzing, searching
# baseline3: stickies, animations, filtering
# baseline4: totally coffelized and refactored
# baseline5: autocopy
# roadmaps: scout calc, equipdetails, shipdetail expand, extensionize, fleet2table
###

google.load("visualization", "1", {packages:["corechart"]})
$ ->
	'use strict'
	deuteriumCIC = Backbone.View.extend
		##---------------------------------------
		# 定義物
		##---------------------------------------
		el: '#dcic'
		json:
			ships: {}
			equipments: {}
		base:
			ships: {}
			shipTypes: {}
			equipments: {}
			items: {}
		analyzedPort: {}
		analyzedFleet: {}
		analyzedFleetText:
			summary: {}
			detailed: {}
		displayOptions:
			sort: 'No'
			invert: false
			levelThreshold: 0
		events:
			'click #analyze': 'clickAnalyze'
			'click #search-equipment-button': 'findEquipment'
			'keyup #search-equipment-input': 'keyupEquipmentInput'
			'click #base-ship-button': 'findShipBase'
			'keyup #base-ship-input': 'keyupBaseInput'
			'click .ship-table-sorter': 'clickSort'
			'click .level-filter': 'clickLevelFilter'
			'click dt.fleet-info': 'clickFleetHead'
			'click dd.fleet-info ul': 'clickFleetDiscription'
		statusAccessor: [
			{index: 0, isImprovable: true, dspName: '火力', varNameOnShip: 'karyoku', varNameOnEquip: 'houg'}
			{index: 1, isImprovable: true, dspName: '雷装', varNameOnShip: 'raisou', varNameOnEquip: 'raig'}
			{index: 2, isImprovable: true, dspName: '対空', varNameOnShip: 'taiku', varNameOnEquip: 'tyku'}
			{index: 3, isImprovable: true, dspName: '耐久', varNameOnShip: 'soukou', varNameOnEquip: 'souk'}
			{index: 4, isImprovable: true, dspName: '運', varNameOnShip: 'lucky', varNameOnEquip: 'luck'}
			{index: 5, isImprovable: false, dspName: '対潜', varNameOnShip: 'taisen', varNameOnEquip: 'tais'}
			{index: 6, isImprovable: false, dspName: '索敵', varNameOnShip: 'sakuteki', varNameOnEquip: 'saku'}
			{index: 7, isImprovable: false, dspName: '射程', varNameOnShip: 'leng', varNameOnEquip: 'leng'}
			{index: 8, isImprovable: false, dspName: '回避', varNameOnShip: 'kaihi', varNameOnEquip: 'houk'}
			# {index: 9, isImprovable: false, dspName: '爆装', varNameOnShip: null, varNameOnEquip: 'baku'}
			# {index: 10, isImprovable: false, dspName: '命中', varNameOnShip: null, varNameOnEquip: 'houm'}
		]


		##---------------------------------------
		# 初期化
		##---------------------------------------
		initialize: ->
			# CIC初期化
			CIC.analyzeOut = false
			CIC.statistics =
				'allImplemented': 0
				'allDistinctOwned': 0
				'shipCount': 0
				'totalExps': 0
				'failedMissions': 0

			@formatMasters()
			@formatTransactions()
			$(window).scroll @scrollWindow
			$(window).resize _.debounce ->
				@adjustStickyWidth
			, 50

			ship = $('#port-input').val()
			if ship
				$('#port-input').val(ship.trim())

			_.bindAll @, 'analyzeShips', 'startAnalyze'


		##---------------------------------------
		# 定義類のデータ構造を再フォーマットする
		##---------------------------------------
		formatMasters: ->
			# 全定義についてインデックスを付加する
			CIC.masters = {}
			CIC.masters.ships = _.indexBy (@reduceKeyPrefixes CIC._masters.api_mst_ship), 'id'
			CIC.masters.shipTypes = _.indexBy (@reduceKeyPrefixes CIC._masters.api_mst_stype), 'id'
			CIC.masters.equipments = _.indexBy (@reduceKeyPrefixes CIC._masters.api_mst_slotitem), 'id'
			CIC.masters.equipmentTypes = _.indexBy (@reduceKeyPrefixes CIC._masters.api_mst_slotitem_equiptype), 'id'
			CIC.masters.items = _.indexBy (@reduceKeyPrefixes CIC._masters.api_mst_useitem), 'id'
			CIC.masters.exptable = CIC._masters.api_mst_exptable

			# 例外値用のダミー装備データを定義
			CIC.masters.nullEquipment =
				atap: 0, bakk: 0, baku: 0, houg: 0, houk: 0, houm: 0, id: -1, info: "", leng: 0, luck: 0, raig: 0, raik: 0, raim: 0, rare: 0, sakb: 0, saku: 0, soku: 0, sortno: 0, souk: 0, taik: 0, tais: 0, tyku: 0, type: [0,0,0,0], name: "∅"
			CIC.masters.undefinedEquipment =
				atap: 0, bakk: 0, baku: 0, houg: 0, houk: 0, houm: 0, id: -1, info: "", leng: 0, luck: 0, raig: 0, raik: 0, raim: 0, rare: 0, sakb: 0, saku: 0, soku: 0, sortno: 0, souk: 0, taik: 0, tais: 0, tyku: 0, type: [0,0,0,0], name: "undef"

			console.log "全マスタ・トランザクション"
			console.log CIC


		##---------------------------------------
		# APIデータの読み込み（暫定）
		##---------------------------------------
		formatTransactions: ->
			# 全定義についてインデックスを付加する
			CIC.transactions = {}
			CIC.transactions.me = CIC._transactions.api_basic
			CIC.transactions.myShips = _.indexBy CIC._transactions.api_ship, 'api_id'
			CIC.transactions.myFleets = _.indexBy CIC._transactions.api_deck_port, 'api_id'
			CIC.transactions.myEquipments = _.indexBy CIC._slotitem, 'api_id'
			# 統計値
			CIC.statistics.failedMissions = CIC.transactions.me.api_ms_count - CIC.transactions.me.api_ms_success


		##---------------------------------------
		# objectキーのapi_を除く
		##---------------------------------------
		reduceKeyPrefixes: (obj)->
			obj = _.map obj, (data)->
				keys = _.map _.keys(data), (key)->
					key.replace /^api_/, ''
				_.object keys, _.values(data)
			obj


		##---------------------------------------
		# 解析ボタンをクリック
		##---------------------------------------
		clickAnalyze: ->
			@overlay 'analyzing...'

			# deferによりoverlayと並列したノンブロッキングな画面更新を実現する
			_.defer @startAnalyze


		##---------------------------------------
		# 解析スタート
		##---------------------------------------
		startAnalyze: ->
			# // var equipment = $('#equipment-input').val()
			# // equipment = equipment ? equipment.match(/\{.+\}/) : '{}'
			# // @json.equipments = $.parseJSON(equipment).api_data
			ship = $('#port-input').val()
			if ship
				ship = if ship then ship.match /\{.+\}/ else '{}'
				CIC._transactions = $.parseJSON(ship).api_data
				@formatTransactions()

			_.defer @analyzeShips
			@overlay false


		##---------------------------------------
		# 艦艇一覧を整形
		##---------------------------------------
		analyzeShips: ->
			outletShips = []

			# データフォーマットしてスコープ変数に格納
			myShips = @reduceKeyPrefixes CIC.transactions.myShips
			myEquips = @reduceKeyPrefixes CIC.transactions.myEquipments
			myFleets = @reduceKeyPrefixes CIC.transactions.myFleets
			baseShips = CIC.masters.ships
			baseEquips = CIC.masters.equipments
			myEquips = _.indexBy myEquips, 'id'

			# 一隻ずつ回して出力オブジェクトを生成する
			_.each myShips, (ship, i)=>
				outlet = status = {}
				shipPkey = ship.id
				shipId = ship.ship_id
				onslots = ship.slot
				baseShip = baseShips[shipId]

				# 艦種をjoinする
				shipTypeId = baseShip.stype
				shipType = CIC.masters.shipTypes[shipTypeId]

				# 装備をjoinする
				onslots = _.map onslots, (equipPkey)->
					if equipPkey == -1
						return null
					return myEquips[equipPkey]
				onslots = _.map onslots, (equip)->
					if equip == null
						return CIC.masters.nullEquipment
					else if equip == undefined
						return CIC.masters.undefinedEquipment
					equipId = equip.slotitem_id
					return baseEquips[equipId]

				# 所属艦隊No.をjoinする
				# fleetLabelString = {0:'', 1:'1', 2:'2', 3:'3', 4:'4'}
				fleetLabelString = {0:'', 1:'一', 2:'二', 3:'三', 4:'四'}
				# fleetLabelString = {0:', 1:'壱', 2:'弐', 3:'参', 4:'肆'}
				belongedFleet = 'n/a'
				belongedFleetName = fleetLabelString[0]
				_.each myFleets, (fleet)->
					_.each fleet.ship, (fleetShipPkey, j)->
						if shipPkey == fleetShipPkey
							belongedFleet = "#{fleet.id}-#{j}"
							belongedFleetName = fleetLabelString[fleet.id]


				# ステータスの分解を開始。まずは艦艇の素体値から：
				for j in [0...@statusAccessor.length]
					accessor = @statusAccessor[j]
					# 強化が存在するステータスかどうか
					reinforcement = if accessor.isImprovable then ship.kyouka[accessor.index] else 0
					singleStatus =
						素体: ship[accessor.varNameOnShip][0]
						最大: ship[accessor.varNameOnShip][1]
						装備補正: 0
						強化補正: reinforcement
						強化残り: null
						現在合計: ship[accessor.varNameOnShip][0]

					# 格納
					status[accessor.dspName] = singleStatus

				# 装備objからステータスを振る。ついでに装備名を取りだしておく
				airMastery = 0
				maxAirMastery = 0
				status.索敵.装備特殊補正 = 0
				equipNames = _.map onslots, (equipObj, n)=>
					# 各ステータスを順に分解
					for m in [0...@statusAccessor.length]
						singleStatus = status[@statusAccessor[m].dspName]
						modify = equipObj[@statusAccessor[m].varNameOnEquip]
						singleStatus.素体 -= modify
						singleStatus.装備補正 += modify
						# ここは何度も回ってて無駄。本来は全スロット中最後の装備だけでやれば良いはず
						singleStatus.強化残り = singleStatus.最大 - singleStatus.素体

					# 制空値の計算
					if equipObj.type[2] in [6, 7, 8, 11]
						currentPlanes = Math.sqrt ship.onslot[n]
						maximumPlanes = Math.sqrt baseShip.maxeq[n]
						antiAir = equipObj.tyku
						airMastery += parseInt currentPlanes * antiAir, 10
						maxAirMastery += parseInt maximumPlanes * antiAir, 10

					# 索敵値の計算
					if equipObj.type[2] in [6, 7, 8, 9, 10, 11]
						status.索敵.装備特殊補正 += equipObj.saku * 2
					if equipObj.type[2] in [12, 13]
						status.索敵.装備特殊補正 += equipObj.saku

					# equipNamesに装備名を出力
					return equipObj.name


				# レベルと経験値の計算
				totalPrev = CIC.masters.exptable[ship.lv].total
				totalNext = CIC.masters.exptable[ship.lv+1].total
				expObj =
					'積算': ship.exp[0]
					'レベル容量': tmp1 = totalNext - totalPrev
					'レベル達成量': tmp2 = ship.exp[0] - totalPrev
					'レベル残り': (if ship.exp[1] == 0 then '' else ship.exp[1])
					'達成率': tmp3 = tmp2 / tmp1
					'達成率%': "#{parseInt(100 * tmp3, 10)}%"

				outlet =
					_equipObj: onslots
					_shipTypeObj: shipType
					_baseShipObj: baseShip
					_sort: ship.sortno
					_baseId: baseShip.id
					_docktime: ship.ndock_time
					pkey: shipPkey
					No: i
					艦種: shipType.name
					艦名: baseShip.name
					艦名よみ: baseShip.yomi
					艦隊: belongedFleetName
					艦隊番号: belongedFleet
					Lv: ship.lv
					経験値: expObj
					次Lv: expObj.レベル残り
					次Lv数値: (if expObj.レベル残り then expObj.レベル残り else '999999')
					士気: ship.cond - 49
					スペック: status
					火力残り: status.火力.強化残り
					雷装残り: status.雷装.強化残り
					対空残り: status.対空.強化残り
					耐久残り: status.耐久.強化残り
					運: status.運.現在合計
					装備名: equipNames
					制空値: airMastery
					最大制空値: maxAirMastery
					索敵値: status.索敵.現在合計
					修復時間: @secondToHour ship.ndock_time, 'normal'
					鍵: if ship.locked then '¶' else ''

				if 0
					console.log "デバッグ出力"
					console.log equipNames
					console.log status
					console.log outlet

				outletShips.push outlet

			@settleAnalyzedResults outletShips


		##---------------------------------------
		# 解析結果をまとめて保存
		##---------------------------------------
		settleAnalyzedResults: (outletShips)->
			# 1-4の艦隊オブジェクトを生成
			myFleets = @reduceKeyPrefixes CIC.transactions.myFleets
			outletFleets = []

			_.each myFleets, (fleet, key)->
				fleetShips = []
				_.each fleet.ship, (shipId)->
					shipObj = _.findWhere outletShips, {pkey: shipId}
					fleetShips.push shipObj

				outletFleets[key] =
					name: fleet.name
					ships: fleetShips

			# 重複なし艦数
			allYomiList = _.map outletShips, (ship)=>
				# 特殊艦種の対応
				@distinguishShipyomiWithShiptype(ship, ship.艦種, '艦名よみ')
				return ship.艦名よみ

			# カウント
			allYomiList = _.groupBy allYomiList, (yomi)->
				return yomi
			allYomiList = _.keys allYomiList

			# 保存
			console.log "所有全艦のダンプ"
			console.log outletShips
			CIC.statistics.allDistinctOwned = allYomiList.length
			CIC.analyzeOut = true
			@analyzedPort = outletShips
			@analyzedFleet = outletFleets

			@detectNonownedShips()
			@generateMotherTable {}
			@renderFleetList()
			@renderLevelChart()


		##---------------------------------------
		# データをテーブルに整形
		##---------------------------------------
		generateMotherTable: ->
			# ソートをかけておく
			shipTable = @applySortAndFilter @analyzedPort
			# フィルタ後の艦数をアップデート
			@numberDrum $('#level-filter-count'), shipTable.length, 1000

			columnOrder = ['No', 'pkey', '艦隊', '艦種', '艦名', 'Lv', '次Lv', '火力残り', '雷装残り', '対空残り', '耐久残り', '運', '士気', '修復時間', '鍵']
			tbody = $('<tbody />')
			thead = $('<thead />')
			templateHeadTh = _.template $('#t-shiptable-head-th').text().trim()

			# ヘッダの生成：jQueryをなるべく避けテキストバッファで処理を進める。愚直にjQueryを使うとものすごく遅い
			superBuffer = ''
			# th
			buffer = ''
			_.each columnOrder, (key)=>
				if key == '修復時間'
					# 修復時間はフロント表示される文字列ではなく内部のint microtimeを使って並べ替える
					sortName = '_docktime'
				else if key == '艦隊'
					# 艦隊番号は漢数字ではなく内部の算用数字で並べ替える
					sortName = '艦隊番号'
				else if key == '次Lv'
					# 次Lvはレベル99のときの空欄の扱いを正しくする
					sortName = '次Lv数値'
				else
					sortName = key

				buffer += templateHeadTh
					headLabel: key
					sortName: sortName
					sortKey: @displayOptions.sort
					isInverted: @displayOptions.invert
			# tr
			superBuffer += "<tr>#{buffer}</tr>"
			$(superBuffer).appendTo(thead)

			# コンテンツの生成：同様の高速化
			superBuffer = ''
			_.each shipTable, (ship, i)->
				# td
				buffer = ''
				_.each columnOrder, (key)->
					buffer += "<td>#{ship[key]}</td>"
				# tr
				superBuffer += "<tr>#{buffer}</tr>"
			$(superBuffer).appendTo(tbody)

			# 最終レンダリング
			@renderShipTable tbody, thead


		##---------------------------------------
		# テーブル表示とStickyの実装
		##---------------------------------------
		renderShipTable: (tbody, thead)->
			# テーブル×2作成
			outletTable = $('<table />')
				.addClass 'output-table static-body'
				.attr {id: 'ship-table'}
			outletTableSticky = $('<table />')
				.addClass 'output-table sticky-header'
				.attr {id: 'ship-table-sticky'}

			# メインテーブル作成
			outletTable.append(thead, tbody)
			$('#mother-table')
				.closest '.output'
				.addClass 'show'
			$('#mother-table')
				.html outletTable
				.css
					height: outletTable.outerHeight()
					# width: 1200
			tbody.addClass('show')

			# スティッキーテーブル作成
			outletTableSticky
				.append thead.clone()
				.appendTo '#mother-table'
			@scrollWindow 'dummy'
			@overlay false

			# アジャスト
			setTimeout =>
				@adjustStickyWidth()
			, 100



		##---------------------------------------
		# スティッキーテーブルの幅調整
		##---------------------------------------
		adjustStickyWidth: ->
			outletTable = $('.output-table.static-body')
			outletTableSticky = $('.output-table.sticky-header')

			# ヘッダ1セルごとの幅指定
			staticTh = outletTable.find('thead th')
			stickyTh = outletTableSticky.find('thead th')

			# まず幅をクリア
			staticTh.each (i)->
				$this = $(@)
				$this.css {width: 'auto'}

			# auto幅を固定化させる
			staticTh.each (i)->
				$this = $(@)
				$this.css {width: $this.width()}
				stickyTh.eq(i).css {width: $this.width()}


		##---------------------------------------
		# ソートキーをクリックした
		##---------------------------------------
		clickSort: (e)->
			elm = $ e.currentTarget
			sortKey = elm.data 'sort'

			# 同じキーを2回クリックしたら逆順にする
			if sortKey == @displayOptions.sort
				@displayOptions.invert = !@displayOptions.invert
			else
				@displayOptions.invert = false

			# ソートキーを設定
			@displayOptions.sort = elm.data 'sort'

			# 再レンダリング
			@generateMotherTable()


		##---------------------------------------
		# レベルフィルタをクリックした
		##---------------------------------------
		clickLevelFilter: (e)->
			elm = $ e.currentTarget

			# スイッチスタイルの操作
			$('.level-filter').addClass('enabled')
			elm.prevAll('.level-filter').removeClass('enabled')

			# 閾値のセット
			@displayOptions.levelThreshold = elm.data('threshold')

			# 再レンダリング
			@generateMotherTable()


		##---------------------------------------
		# 艦のフィルタリングとソート
		##---------------------------------------
		applySortAndFilter: (shipTable)->
			_shipTable = _.clone shipTable
			options = @displayOptions

			# ソート実行：最初にデフォルトソートの適用
			if options.sort != 'No'
				_shipTable = _.sortBy _shipTable, (ship)->
					ship.No

			# ソート実行：次にプライマリソートの適用
			_shipTable = _.sortBy _shipTable, (ship)->
				ship[options.sort]

			# 逆順ソートの対応
			if options.invert
				_shipTable = _shipTable.reverse()

			# レベルフィルタの適用
			_shipTable = _.reject _shipTable, (ship)->
				ship.Lv < options.levelThreshold

			_shipTable


		##---------------------------------------
		# 艦隊表示
		##---------------------------------------
		renderFleetList: ->
			section = $('.fleet-equipdetails').empty()
			dl = $('<dl />').attr({id: 'fleet-list'})

			templateDecksummaryTextEachship = _.template $('#t-decksummary-text-eachship').text().trim()
			templateDecksummaryEachship = _.template $('#t-decksummary-eachship').text().trim()
			templateDecksummaryHead = _.template $('#t-decksummary-head').text().trim()
			templateDecksummaryTextContent = _.template $('#t-decksummary-text-content').text().trim()
			templateDecksummaryContent = _.template $('#t-decksummary-content').text().trim()
			templateDecksummaryList = _.template $('#t-decksummary-list').text().trim()
			templateDeckdetailTextEachship = _.template $('#t-deckdetail-text-eachship').text().trim()
			templateDeckdetailEachship = _.template $('#t-deckdetail-eachship').text().trim()
			templateDeckdetailList = _.template $('#t-deckdetail-list').text().trim()


			_.each @analyzedFleet, (fleet, fNumber)=>
				fleetNumber = fNumber + 1
				textBuffer = [];
				textBuffer2 = [];

				dl.append(
					$ templateDecksummaryHead
						fleetNumber: fleetNumber
						fleetName: fleet.name
				)
				ul = $ templateDecksummaryList
					fleetNumber: fleetNumber
				ul2 = $ templateDeckdetailList
					fleetNumber: fleetNumber


				# 制空と索敵
				totalAirMastery = 0
				scout =
					艦隊総計: 0
					素体合計: 0
					装備合計: 0
					特殊計算総計: 0

				# 艦隊の構成艦を一隻ずつ回す
				_.each fleet.ships, (ship, shipNumber)->
					if ship == undefined
						return true

					# 艦隊テキスト出力
					equipNames = []
					_.each ship._equipObj, (equip)->
						if(equip.id != -1)
							equipNames.push equip.name
					if equipNames.length == 0 then equipNames = ['∅']

					# 制空値と索敵値
					totalAirMastery += ship.制空値
					scout.艦隊総計 += ship.索敵値
					scout.素体合計 += ship.スペック.索敵.素体
					scout.装備合計 += ship.スペック.索敵.装備特殊補正

					# リスト作成
					ul.append(
						$ templateDecksummaryEachship
							isFlagship: shipNumber == 0
							type: ship.艦種
							name: ship.艦名
							level: ship.Lv
							condition: ship.士気
					)
					ul2.append(
						$ templateDeckdetailEachship
							isFlagship: shipNumber == 0
							name: ship.艦名
							level: ship.Lv
							equipments: equipNames.join('、')
					)

					textBuffer.push(
					 templateDecksummaryTextEachship
							isFlagship: shipNumber == 0
							type: ship.艦種
							name: ship.艦名
							level: ship.Lv
							condition: ship.士気
					)
					textBuffer2.push(
					 templateDeckdetailTextEachship
							isFlagship: shipNumber == 0
							name: ship.艦名
							level: ship.Lv
							equipments: equipNames.join('、')
					)

				# 艦隊自体が存在しなかった場合
				fleetShipsCount = _.compact(fleet.ships).length
				if fleetShipsCount == 0
					li = $('<li />').append("<span class=#{"ship-type"}>なし</span>")
					li.appendTo(ul)
					li.appendTo(ul2)

				# 電探 + 索敵機×2 + √(素体索敵値の艦隊合計)
				scout.特殊計算総計 = Math.floor Math.sqrt(scout.素体合計) + scout.装備合計

				dd = $ templateDecksummaryContent
					fleetNumber: fleetNumber
					totalAirMastery: totalAirMastery
					totalScout: scout.艦隊総計
					totalWeirdScout: scout.特殊計算総計

				textHead = templateDecksummaryTextContent
					fleetNumber: fleetNumber
					totalAirMastery: totalAirMastery
					totalScout: scout.艦隊総計
					totalWeirdScout: scout.特殊計算総計

				# リスト出力
				ul.appendTo(dd)
				ul2.appendTo(dd)
				dd.appendTo(dl)
				textBuffer.unshift textHead
				textBuffer2.unshift textHead
				@analyzedFleetText.summary[fleetNumber] = textBuffer.join '\n'
				@analyzedFleetText.detailed[fleetNumber] = textBuffer2.join '\n'

				dd.css {height: fleetShipsCount * 25 + 30}


			# CSSとあわせてアニメーションを実現
			$('#fleet-summary').closest('.output').addClass('show')
			$('#fleet-summary').html(dl).css {height: dl.outerHeight()}
			dl.addClass('show')


		##---------------------------------------
		# 艦隊ヘッダをクリックした
		##---------------------------------------
		clickFleetHead: (e)->
			elm = $ e.currentTarget
			fleetNumber = elm.data('fleet')

			$ "dt.fleet-#{fleetNumber}, dd.fleet-#{fleetNumber}"
				.toggleClass 'tweaken'

		##---------------------------------------
		# 艦隊構成をクリックした
		##---------------------------------------
		clickFleetDiscription: (e)->
			elm = $(e.currentTarget).closest('.fleet-info')
			fleetNumber = elm.data('fleet')

			if elm.hasClass 'tweaken'
				output = @analyzedFleetText.detailed[fleetNumber]
			else
				output = @analyzedFleetText.summary[fleetNumber]

			# テキストエリア生成
			copyArea = $('<textarea />').text(output).addClass('copy').attr({rows: 7})
			copyDiv = $('<div />').addClass('copy-wrapper').append(copyArea)
			elm.append(copyDiv)

			# コピーAPIのサポート状況確認
			# http://qiita.com/yoichiro@github/items/43ee75196bf643cde093
			isSupported = document.queryCommandSupported('cut')
			if !isSupported
				return

			# エリア選択・コピー実行
			copyArea.get(0).select()
			try
				isSuccessful = document.execCommand 'cut'
				if isSuccessful
					@notify 'Copied!'
			catch err
				console.log 'Unable to copy.'

			# 用済みのコピー対象を消去
			copyDiv.remove()




		##---------------------------------------
		# 特殊艦種の分解
		##---------------------------------------
		distinguishShipyomiWithShiptype: (ship, shipType, yomiKey)->
			if ship[yomiKey] in ["ちとせ", "ちよだ"]
				ship[yomiKey] = "#{ship[yomiKey]}・#{shipType}"
			else if ship[yomiKey] == "たいげい・りゅうほう"
				if shipType == "潜水母艦"
					ship[yomiKey] = "たいげい・#{shipType}"
				else if shipType == "軽空母"
					ship[yomiKey] = "りゅうほう・#{shipType}"

			return ship


		##---------------------------------------
		# 未所持艦の検出
		##---------------------------------------
		detectNonownedShips: (myShips, baseShips)->
			myShips = @reduceKeyPrefixes CIC.transactions.myShips
			baseShips = CIC.masters.ships
			shipTypes = CIC.masters.shipTypes

			# 特殊艦種の個別対応
			baseShips = _.each baseShips, (base)=>
				@distinguishShipyomiWithShiptype(base, shipTypes[base.stype].name, 'yomi')

			# 深海艦を除く
			baseShips = _.reject baseShips, (base)->
				if base.sortno == 0
					return true

			# 全艦のカウント
			allImplemented = _.groupBy baseShips, (base)->
				base.yomi
			allImplemented = _.keys allImplemented
			CIC.statistics.allImplemented = allImplemented
			console.log "実装済み全艦の一覧"
			console.log allImplemented

			# 艦の消し込み
			ownedShipYomi = []
			_.each myShips, (ship)->
				baseShips = _.reject baseShips, (base)->
					# 持っている艦を除く
					if base.id == ship.ship_id
						ownedShipYomi.push base.yomi
						return true

			# 所持艦と読みを同じくする艦も消す
			_.each ownedShipYomi, (yomi)->
				baseShips = _.reject baseShips, (base)->
					(base.yomi == yomi)

			# 未所持艦を読みでグループ化
			baseShips = _.groupBy baseShips, (base)->
				base.yomi

			# 読みを正式名に転換
			outletShips = []
			_.each baseShips, (ships, yomi)->
				# レベル順にソートしておく
				ships = _.sortBy ships, (ship)->
					if ship.afterlv == 0
						ship.afterlv = 999
					return ship.afterlv

				groupName = []
				_.each ships, (ship)->
					groupName.push ship.name
				nonOwned =
					name: groupName.join('/')
					yomi: yomi
					ships: ships
				outletShips.push nonOwned

			# レンダリング
			@renderNonownedShips outletShips


		##---------------------------------------
		# 未所持艦の表示
		##---------------------------------------
		renderNonownedShips: (nonOwned)->
			dl = $('<dl />').attr({id: 'nonowned-list'})

			_.each nonOwned, (shipGroup, key)->
				dt = $('<dt />').text("#{shipGroup.name}（#{shipGroup.yomi}）").appendTo dl
				ul = $('<ul />')

				_.each shipGroup.ships, (ship)->
					shipType = CIC.masters.shipTypes[ship.stype]
					li = $ '<li />'
						.append "<span class=#{"ship-type"}>#{shipType.name}</span>"
						.append "<span class=#{"ship-name"}>#{ship.name}</span>"
						.appendTo ul

				if shipGroup.ships.length == 0
					li = $('<li />').append("<span class=#{"ship-type"}>なし</span>").appendTo(ul)

				dd = $ '<dd />'
				ul.appendTo(dd)
				dd.appendTo(dl)

			# なし の表示
			if nonOwned.length == 0
				dt = $('<dt />').text("なし").appendTo dl
				ul = $('<ul />')
				li = $('<li />').text("なし").appendTo ul
				dd = $('<dd />').append(ul).appendTo dl

			# CSSとあわせてアニメーションを実現
			$('#nonowned-ships').closest('.output').addClass('show')
			$('#nonowned-ships').html(dl).css {height: dl.outerHeight()}
			dl.addClass('show')


		##---------------------------------------
		# 装備検索（スペース区切りAnd検索）
		##---------------------------------------
		keyupEquipmentInput: (e)->
			if e.keyCode == 13
				@findEquipment()

		findEquipment: ()->
			if !CIC.analyzeOut
				return false

			# 検索文字列の取得
			searchText = $('#search-equipment-input').val().trim()
			if searchText == ''
				return false
			searchArray = searchText.split /\s/

			# スペース区切りAnd検索の実装
			foundEquipmentBase = _.clone CIC.masters.equipments
			_.each searchArray, (search)->
				reSearch = new RegExp search, 'i'
				foundEquipmentBase = _.filter foundEquipmentBase, (equip)->
					(equip.name).match reSearch

			# 合致した装備
			_.map foundEquipmentBase, (eqBase)=>
				# 装備種別をjoinする
				eqType = eqBase.type[2]
				eqTypeName = CIC.masters.equipmentTypes[eqType].name
				eqBase.typeName = eqTypeName;
				eqBase.fullName = "#{eqTypeName} :: #{eqBase.name}"

				# 該当の装備を載せている艦
				searchId = eqBase.id
				shipHas = []
				_.each @analyzedPort, (ship)->
					# 一艦上の搭載数を数える
					equippedCountOnShip = 0
					_.each ship._equipObj, (equip)->
						if equip.id == eqBase.id
							equippedCountOnShip++
					if equippedCountOnShip
						ship.搭載数 = equippedCountOnShip
						shipHas.push ship

				# 所有数を数える
				ownedCount = 0
				_.each CIC.transactions.myEquipments, (myEquip)->
					if myEquip.api_slotitem_id == eqBase.id
						ownedCount++
				eqBase._shipHas = shipHas
				eqBase._ownedCount = ownedCount

			# レンダリング
			@renderFoundEquipments foundEquipmentBase


		##---------------------------------------
		# 見つかった装備と搭載艦の表示
		##---------------------------------------
		renderFoundEquipments: (founds)->
			dl = $('<dl />').attr({id: 'found-equipments-list'})

			_.each founds, (equip)->
				if equip.sortno == 0
					# 深海装備をスキップ
					return true
				dt = $ '<dt />'
					.text(equip.fullName).appendTo(dl)
				dd = $ '<dd />'
				ul = $ '<ul />'

				shipHas = _.sortBy equip._shipHas, (ship)->
					ship.Lv

				# 艦ごとに搭載数を表示
				freeEquipCount = equip._ownedCount
				_.each shipHas, (ship)->
					li = $ '<li />'
						.append "<span class=#{"ship-count"}>#{ship.搭載数}×</span>"
						.append "<span class=#{"ship-type"}>#{ship.艦種}</span>"
						.append "<span class=#{"ship-name"}>#{ship.艦名}</span>"
						.append "<span class=#{"ship-lv"}>Lv.#{ship.Lv}</span>"
						.appendTo ul
					freeEquipCount -= ship.搭載数

				if equip._ownedCount != 0
					# 遊離数
					li = $ '<li />'
						.append "<span class=#{"ship-count"}>#{freeEquipCount}×</span>"
						.append "<span class=#{"ship-type"}>遊離</span>"
						.prependTo ul
					# 全所持数
					li = $ '<li />'
						.append "<span class=#{"ship-count"}>#{equip._ownedCount}×</span>"
						.append "<span class=#{"ship-type"}>全体</span>"
						.prependTo ul
				else
					li = $ '<li />'
						.append "<span class=#{"ship-type"}>なし</span>"
						.appendTo ul

				ul.appendTo(dd)
				dd.appendTo(dl)

			# CSSとあわせてアニメーションを実現
			$('#search-result').closest('.output').addClass('show')
			$('#search-result').html(dl).css {height: dl.outerHeight()}
			dl.addClass('show')
			console.log "合致した装備のマスタ"
			console.log _.indexBy(founds, 'name')


		##---------------------------------------
		# 艦base出力
		##---------------------------------------
		keyupBaseInput: (e)->
			if e.keyCode == 13
				@findShipBase()
		findShipBase: ()->
			# 検索文字列の取得
			searchText = $('#base-ship-input').val().trim()
			if searchText == ''
				return false
			searchArray = searchText.split /\s/

			# スペース区切りAnd検索の実装
			foundShipBase = _.clone CIC.masters.ships
			_.each searchArray, (search)->
				reSearch = new RegExp search, 'i'
				foundShipBase = _.filter foundShipBase, (ship)->
					(ship.name).match reSearch

			# 合致した艦base
			console.log "合致した艦マスタ"
			console.log foundShipBase
			if !CIC.analyzeOut
				return false

			console.log "合致した所有艦"
			_.each foundShipBase, (shipBase)=>
				# の実インスタンス
				searchId = shipBase.id
				foundShipInstances = _.filter @analyzedPort, (ship)->
					return ship._baseId == shipBase.id

				if foundShipInstances.length
					console.log "- #{shipBase.name}"
					console.log foundShipInstances


		renderLevelChart: ->
			# 各レベル範囲を配列で作成
			levelSection = _.range(1, 150, 10)

			# データ系列（艦種）を作成
			shipTypes = _.countBy @analyzedPort, (ship)->
				ship.艦種
			shipTypeNames = _.map shipTypes, (count, type)->
				type
			shipTypeNames.reverse().unshift('')

			# 出力オブジェクトの雛形
			levelObj = _.map levelSection, (initialLevel)->
				# 艦種の数だけゼロで埋める
				initCounter = []
				_(shipTypeNames.length).times ->
					initCounter.push 0

				# 先頭にラベル
				initCounter[0] = "#{initialLevel}～"
				initCounter

			# 合致するレベル範囲の数値を1増やす
			shipCount = 0
			totalExp = 0
			_.each @analyzedPort, (ship)->
				# 合致するレベル範囲ID
				sectionId = _.sortedIndex(levelSection, ship.Lv+1) - 1
				# 艦種ID
				shipTypeId = _.indexOf shipTypeNames, ship.艦種
				# 合致した表のマスを1増やす
				levelObj[sectionId][shipTypeId]++
				# 経験値合計を取得
				shipCount++
				totalExp += ship.経験値.積算

			# 統計情報保存
			CIC.statistics.shipCount = shipCount
			CIC.statistics.totalExps = s.numberFormat(totalExp, 0, '.', ',')

			# ラベル作成
			levelObj.unshift shipTypeNames

			# 描画
			data = google.visualization.arrayToDataTable levelObj
			options =
				isStacked: true
				connectSteps: false
				width: 900
				height: 500
				selectionMode: 'multiple'
				chartArea:
					width: '77%'
					height: '91%'
					top: 20
					left: 50
				hAxis:
					textStyle:
						fontSize: 12
				colors: ['#028e9b', '#4374e0', '#53a8fb', '#f1ca3a', '#e49307', '#000000', '#888888', '#cccccc', '#ff7800']

			chart = new google.visualization.SteppedAreaChart $('#level-chart').get(0)
			chart.draw data, options

			# 全体統計値
			templateOverall = _.template $('#t-overall-content').text().trim()
			$ '#overall-stat'
				.empty()
				.append templateOverall
					shipCount: CIC.statistics.shipCount
					distinctShipCount: CIC.statistics.allDistinctOwned
					totalExps: CIC.statistics.totalExps
					failedMissions: CIC.statistics.failedMissions

			# 画面反映
			$('.level-histgram').addClass('show')


		##---------------------------------------
		# 秒を時分秒のテキストに
		##---------------------------------------
		secondToHour: (millisec, style)->
			sec = millisec/1000
			hour = parseInt sec/3600
			sec = sec%3600
			minute = parseInt sec/60
			sec = sec%60
			second = parseInt sec
			minute = s.lpad minute, 2, '0'
			second = s.lpad second, 2, '0'

			if style == 'degree'
				units = {h: '°', m: '′', s: '″'}
			else if style == 'colons'
				units = {h: ':', m: ':', s: ''}
			else
				units = {h: '時間', m: '分', s: '秒'}

			out = []
			if hour > 0
				out.push hour
				out.push units.h
			if minute > 0 || hour > 0
				out.push minute
				out.push units.m
			if minute > 0 || hour > 0 || second > 0
				out.push second
				out.push units.s

			return out.join ''


		##---------------------------------------
		# スクロールにヘッダを追従
		##---------------------------------------
		scrollWindow: (e)->
			if !CIC.analyzeOut
				return false

			normal = $ '#ship-table'
			sticky = $ '#ship-table-sticky'

			_.debounce( ->
				threshold = normal.offset().top
				limit = threshold + normal.outerHeight()
				scrolled = $('body').scrollTop()
				if limit < scrolled
					sticky.removeClass('hold').css {top: 0}
					normal.removeClass('hold')
				else if threshold < scrolled
					sticky.addClass('hold').stop().css {top: scrolled}
					normal.addClass('hold')
				else
					sticky.removeClass('hold').css {top: 0}
					normal.removeClass('hold')
			, 50)()


		##---------------------------------------
		# 数字を徐々に近づける
		##---------------------------------------
		numberDrum: ($elm, to, duration)->
			interval = 40
			step = 0
			next = from = parseInt $elm.text(), 10
			diff = to - from

			allSteps = duration / interval
			easingFunction = (progress)->
				# 変数域変換 0..1 -> -2..0
				argv = (progress-1)*3
				# y = x^3
				result = Math.pow(argv, 3)
				# 値域変換 -27..0 -> 0..1
				return result/27 + 1


			startTime = +new Date()
			repeater = setInterval ()->
					passedTime = new Date() - startTime
					progress = Math.min passedTime / duration, 1
					value = from + diff*easingFunction(progress)
					$elm.text(parseInt value, 10)
				, interval

			setTimeout ()->
					clearInterval repeater
					$elm.text(parseInt to, 10)
				, duration+100


		##---------------------------------------
		# オーバレイの設置、解除
		##---------------------------------------
		overlay: (announcement)->
			layer = ->
				if announcement
					@set(announcement)
				else
					@unset()

			layer::set = (announcement)->
				loader = $('<div />').addClass('loader').attr('id', 'loader').text(announcement).prependTo('body')
				vOffset = ($(window).height() - loader.outerHeight()) /2
				hOffset = ($(window).width() - loader.outerWidth()) /2
				$('#loader').css {top: vOffset, left: hOffset, position: 'fixed'}

				overlay = $('<div />').addClass('overlay').attr
					id: 'overlay'
					onClick: 'javascript: return false;'
				.css height: $(document).height()

				$('body').prepend overlay

			layer::unset = ->
				$('#overlay, #loader').remove()

			new layer()



		##---------------------------------------
		# 全画面メッセージの表示
		##---------------------------------------
		notify: (message)->

			# 要素準備
			statement = $ '<p />'
				.addClass 'notification-statement'
				.text message
			notification = $ '<div />'
				.append statement
				.addClass 'fullscreen-notification'
				.prependTo 'body'

			# 位置合せ
			vOffset = ($(window).height() - statement.outerHeight()) /2
			hOffset = ($(window).width() - statement.outerWidth()) /2
			statement
				.css {top: vOffset, left: hOffset}

			# 動きをつけて完了後消す
			notification.addClass 'readable'
			setTimeout ->
					# 動きをつけて完了後消す
					notification.addClass 'flush'
					setTimeout ->
							notification.remove()
						, 630
				, 400




	anbk = new deuteriumCIC()
