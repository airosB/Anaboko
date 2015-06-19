
/*
 * DeuteriumCIC baseline5 mod.0
 * baseline1: only aligning / table rendering
 * baseline2: calculating, analyzing, searching
 * baseline3: stickies, animations, filtering
 * baseline4: totally coffelized and refactored
 * baseline5: autocopy
 * roadmaps: scout calc, equipdetails, shipdetail expand, extensionize, fleet2table
 */
google.load("visualization", "1", {
  packages: ["corechart"]
});

$(function() {
  'use strict';
  var anbk, deuteriumCIC;
  deuteriumCIC = Backbone.View.extend({
    el: '#dcic',
    json: {
      ships: {},
      equipments: {}
    },
    base: {
      ships: {},
      shipTypes: {},
      equipments: {},
      items: {}
    },
    analyzedPort: {},
    analyzedFleet: {},
    analyzedFleetText: {
      summary: {},
      detailed: {}
    },
    displayOptions: {
      sort: 'No',
      invert: false,
      levelThreshold: 0
    },
    events: {
      'click #analyze': 'clickAnalyze',
      'click #search-equipment-button': 'findEquipment',
      'keyup #search-equipment-input': 'keyupEquipmentInput',
      'click #base-ship-button': 'findShipBase',
      'keyup #base-ship-input': 'keyupBaseInput',
      'click .ship-table-sorter': 'clickSort',
      'click .level-filter': 'clickLevelFilter',
      'click dt.fleet-info': 'clickFleetHead',
      'click dd.fleet-info ul': 'clickFleetDiscription'
    },
    statusAccessor: [
      {
        index: 0,
        isImprovable: true,
        dspName: '火力',
        varNameOnShip: 'karyoku',
        varNameOnEquip: 'houg'
      }, {
        index: 1,
        isImprovable: true,
        dspName: '雷装',
        varNameOnShip: 'raisou',
        varNameOnEquip: 'raig'
      }, {
        index: 2,
        isImprovable: true,
        dspName: '対空',
        varNameOnShip: 'taiku',
        varNameOnEquip: 'tyku'
      }, {
        index: 3,
        isImprovable: true,
        dspName: '耐久',
        varNameOnShip: 'soukou',
        varNameOnEquip: 'souk'
      }, {
        index: 4,
        isImprovable: true,
        dspName: '運',
        varNameOnShip: 'lucky',
        varNameOnEquip: 'luck'
      }, {
        index: 5,
        isImprovable: false,
        dspName: '対潜',
        varNameOnShip: 'taisen',
        varNameOnEquip: 'tais'
      }, {
        index: 6,
        isImprovable: false,
        dspName: '索敵',
        varNameOnShip: 'sakuteki',
        varNameOnEquip: 'saku'
      }, {
        index: 7,
        isImprovable: false,
        dspName: '射程',
        varNameOnShip: 'leng',
        varNameOnEquip: 'leng'
      }, {
        index: 8,
        isImprovable: false,
        dspName: '回避',
        varNameOnShip: 'kaihi',
        varNameOnEquip: 'houk'
      }
    ],
    initialize: function() {
      var ship;
      CIC.analyzeOut = false;
      CIC.statistics = {
        'allImplemented': 0,
        'allDistinctOwned': 0,
        'shipCount': 0,
        'totalExps': 0,
        'failedMissions': 0
      };
      this.formatMasters();
      this.formatTransactions();
      $(window).scroll(this.scrollWindow);
      $(window).resize(_.debounce(function() {
        return this.adjustStickyWidth;
      }, 50));
      ship = $('#port-input').val();
      if (ship) {
        $('#port-input').val(ship.trim());
      }
      return _.bindAll(this, 'analyzeShips', 'startAnalyze');
    },
    formatMasters: function() {
      CIC.masters = {};
      CIC.masters.ships = _.indexBy(this.reduceKeyPrefixes(CIC._masters.api_mst_ship), 'id');
      CIC.masters.shipTypes = _.indexBy(this.reduceKeyPrefixes(CIC._masters.api_mst_stype), 'id');
      CIC.masters.equipments = _.indexBy(this.reduceKeyPrefixes(CIC._masters.api_mst_slotitem), 'id');
      CIC.masters.equipmentTypes = _.indexBy(this.reduceKeyPrefixes(CIC._masters.api_mst_slotitem_equiptype), 'id');
      CIC.masters.items = _.indexBy(this.reduceKeyPrefixes(CIC._masters.api_mst_useitem), 'id');
      CIC.masters.exptable = CIC._masters.api_mst_exptable;
      CIC.masters.nullEquipment = {
        atap: 0,
        bakk: 0,
        baku: 0,
        houg: 0,
        houk: 0,
        houm: 0,
        id: -1,
        info: "",
        leng: 0,
        luck: 0,
        raig: 0,
        raik: 0,
        raim: 0,
        rare: 0,
        sakb: 0,
        saku: 0,
        soku: 0,
        sortno: 0,
        souk: 0,
        taik: 0,
        tais: 0,
        tyku: 0,
        type: [0, 0, 0, 0],
        name: "∅"
      };
      CIC.masters.undefinedEquipment = {
        atap: 0,
        bakk: 0,
        baku: 0,
        houg: 0,
        houk: 0,
        houm: 0,
        id: -1,
        info: "",
        leng: 0,
        luck: 0,
        raig: 0,
        raik: 0,
        raim: 0,
        rare: 0,
        sakb: 0,
        saku: 0,
        soku: 0,
        sortno: 0,
        souk: 0,
        taik: 0,
        tais: 0,
        tyku: 0,
        type: [0, 0, 0, 0],
        name: "undef"
      };
      console.log("全マスタ・トランザクション");
      return console.log(CIC);
    },
    formatTransactions: function() {
      CIC.transactions = {};
      CIC.transactions.me = CIC._transactions.api_basic;
      CIC.transactions.myShips = _.indexBy(CIC._transactions.api_ship, 'api_id');
      CIC.transactions.myFleets = _.indexBy(CIC._transactions.api_deck_port, 'api_id');
      CIC.transactions.myEquipments = _.indexBy(CIC._slotitem, 'api_id');
      return CIC.statistics.failedMissions = CIC.transactions.me.api_ms_count - CIC.transactions.me.api_ms_success;
    },
    reduceKeyPrefixes: function(obj) {
      obj = _.map(obj, function(data) {
        var keys;
        keys = _.map(_.keys(data), function(key) {
          return key.replace(/^api_/, '');
        });
        return _.object(keys, _.values(data));
      });
      return obj;
    },
    clickAnalyze: function() {
      this.overlay('analyzing...');
      return _.defer(this.startAnalyze);
    },
    startAnalyze: function() {
      var ship;
      ship = $('#port-input').val();
      if (ship) {
        ship = ship ? ship.match(/\{.+\}/) : '{}';
        CIC._transactions = $.parseJSON(ship).api_data;
        this.formatTransactions();
      }
      _.defer(this.analyzeShips);
      return this.overlay(false);
    },
    analyzeShips: function() {
      var baseEquips, baseShips, myEquips, myFleets, myShips, outletShips;
      outletShips = [];
      myShips = this.reduceKeyPrefixes(CIC.transactions.myShips);
      myEquips = this.reduceKeyPrefixes(CIC.transactions.myEquipments);
      myFleets = this.reduceKeyPrefixes(CIC.transactions.myFleets);
      baseShips = CIC.masters.ships;
      baseEquips = CIC.masters.equipments;
      myEquips = _.indexBy(myEquips, 'id');
      _.each(myShips, (function(_this) {
        return function(ship, i) {
          var accessor, airMastery, baseShip, belongedFleet, belongedFleetName, equipNames, expObj, fleetLabelString, j, maxAirMastery, onslots, outlet, reinforcement, shipId, shipPkey, shipType, shipTypeId, singleStatus, status, tmp1, tmp2, tmp3, totalNext, totalPrev, _i, _ref;
          outlet = status = {};
          shipPkey = ship.id;
          shipId = ship.ship_id;
          onslots = ship.slot;
          baseShip = baseShips[shipId];
          shipTypeId = baseShip.stype;
          shipType = CIC.masters.shipTypes[shipTypeId];
          onslots = _.map(onslots, function(equipPkey) {
            if (equipPkey === -1) {
              return null;
            }
            return myEquips[equipPkey];
          });
          onslots = _.map(onslots, function(equip) {
            var equipId;
            if (equip === null) {
              return CIC.masters.nullEquipment;
            } else if (equip === void 0) {
              return CIC.masters.undefinedEquipment;
            }
            equipId = equip.slotitem_id;
            return baseEquips[equipId];
          });
          fleetLabelString = {
            0: '',
            1: '一',
            2: '二',
            3: '三',
            4: '四'
          };
          belongedFleet = 'n/a';
          belongedFleetName = fleetLabelString[0];
          _.each(myFleets, function(fleet) {
            return _.each(fleet.ship, function(fleetShipPkey, j) {
              if (shipPkey === fleetShipPkey) {
                belongedFleet = "" + fleet.id + "-" + j;
                return belongedFleetName = fleetLabelString[fleet.id];
              }
            });
          });
          for (j = _i = 0, _ref = _this.statusAccessor.length; 0 <= _ref ? _i < _ref : _i > _ref; j = 0 <= _ref ? ++_i : --_i) {
            accessor = _this.statusAccessor[j];
            reinforcement = accessor.isImprovable ? ship.kyouka[accessor.index] : 0;
            singleStatus = {
              素体: ship[accessor.varNameOnShip][0],
              最大: ship[accessor.varNameOnShip][1],
              装備補正: 0,
              強化補正: reinforcement,
              強化残り: null,
              現在合計: ship[accessor.varNameOnShip][0]
            };
            status[accessor.dspName] = singleStatus;
          }
          airMastery = 0;
          maxAirMastery = 0;
          status.索敵.装備特殊補正 = 0;
          equipNames = _.map(onslots, function(equipObj, n) {
            var antiAir, currentPlanes, m, maximumPlanes, modify, _j, _ref1, _ref2, _ref3, _ref4;
            for (m = _j = 0, _ref1 = _this.statusAccessor.length; 0 <= _ref1 ? _j < _ref1 : _j > _ref1; m = 0 <= _ref1 ? ++_j : --_j) {
              singleStatus = status[_this.statusAccessor[m].dspName];
              modify = equipObj[_this.statusAccessor[m].varNameOnEquip];
              singleStatus.素体 -= modify;
              singleStatus.装備補正 += modify;
              singleStatus.強化残り = singleStatus.最大 - singleStatus.素体;
            }
            if ((_ref2 = equipObj.type[2]) === 6 || _ref2 === 7 || _ref2 === 8 || _ref2 === 11) {
              currentPlanes = Math.sqrt(ship.onslot[n]);
              maximumPlanes = Math.sqrt(baseShip.maxeq[n]);
              antiAir = equipObj.tyku;
              airMastery += parseInt(currentPlanes * antiAir, 10);
              maxAirMastery += parseInt(maximumPlanes * antiAir, 10);
            }
            if ((_ref3 = equipObj.type[2]) === 6 || _ref3 === 7 || _ref3 === 8 || _ref3 === 9 || _ref3 === 10 || _ref3 === 11) {
              status.索敵.装備特殊補正 += equipObj.saku * 2;
            }
            if ((_ref4 = equipObj.type[2]) === 12 || _ref4 === 13) {
              status.索敵.装備特殊補正 += equipObj.saku;
            }
            return equipObj.name;
          });
          totalPrev = CIC.masters.exptable[ship.lv].total;
          totalNext = CIC.masters.exptable[ship.lv + 1].total;
          expObj = {
            '積算': ship.exp[0],
            'レベル容量': tmp1 = totalNext - totalPrev,
            'レベル達成量': tmp2 = ship.exp[0] - totalPrev,
            'レベル残り': (ship.exp[1] === 0 ? '' : ship.exp[1]),
            '達成率': tmp3 = tmp2 / tmp1,
            '達成率%': "" + (parseInt(100 * tmp3, 10)) + "%"
          };
          outlet = {
            _equipObj: onslots,
            _shipTypeObj: shipType,
            _baseShipObj: baseShip,
            _sort: ship.sortno,
            _baseId: baseShip.id,
            _docktime: ship.ndock_time,
            pkey: shipPkey,
            No: i,
            艦種: shipType.name,
            艦名: baseShip.name,
            艦名よみ: baseShip.yomi,
            艦隊: belongedFleetName,
            艦隊番号: belongedFleet,
            Lv: ship.lv,
            経験値: expObj,
            次Lv: expObj.レベル残り,
            次Lv数値: (expObj.レベル残り ? expObj.レベル残り : '999999'),
            士気: ship.cond - 49,
            スペック: status,
            火力残り: status.火力.強化残り,
            雷装残り: status.雷装.強化残り,
            対空残り: status.対空.強化残り,
            耐久残り: status.耐久.強化残り,
            運: status.運.現在合計,
            装備名: equipNames,
            制空値: airMastery,
            最大制空値: maxAirMastery,
            索敵値: status.索敵.現在合計,
            修復時間: _this.secondToHour(ship.ndock_time, 'normal'),
            鍵: ship.locked ? '¶' : ''
          };
          if (0) {
            console.log("デバッグ出力");
            console.log(equipNames);
            console.log(status);
            console.log(outlet);
          }
          return outletShips.push(outlet);
        };
      })(this));
      return this.settleAnalyzedResults(outletShips);
    },
    settleAnalyzedResults: function(outletShips) {
      var allYomiList, myFleets, outletFleets;
      myFleets = this.reduceKeyPrefixes(CIC.transactions.myFleets);
      outletFleets = [];
      _.each(myFleets, function(fleet, key) {
        var fleetShips;
        fleetShips = [];
        _.each(fleet.ship, function(shipId) {
          var shipObj;
          shipObj = _.findWhere(outletShips, {
            pkey: shipId
          });
          return fleetShips.push(shipObj);
        });
        return outletFleets[key] = {
          name: fleet.name,
          ships: fleetShips
        };
      });
      allYomiList = _.map(outletShips, (function(_this) {
        return function(ship) {
          _this.distinguishShipyomiWithShiptype(ship, ship.艦種, '艦名よみ');
          return ship.艦名よみ;
        };
      })(this));
      allYomiList = _.groupBy(allYomiList, function(yomi) {
        return yomi;
      });
      allYomiList = _.keys(allYomiList);
      console.log("所有全艦のダンプ");
      console.log(outletShips);
      CIC.statistics.allDistinctOwned = allYomiList.length;
      CIC.analyzeOut = true;
      this.analyzedPort = outletShips;
      this.analyzedFleet = outletFleets;
      this.detectNonownedShips();
      this.generateMotherTable({});
      this.renderFleetList();
      return this.renderLevelChart();
    },
    generateMotherTable: function() {
      var buffer, columnOrder, shipTable, superBuffer, tbody, templateHeadTh, thead;
      shipTable = this.applySortAndFilter(this.analyzedPort);
      this.numberDrum($('#level-filter-count'), shipTable.length, 1000);
      columnOrder = ['No', 'pkey', '艦隊', '艦種', '艦名', 'Lv', '次Lv', '火力残り', '雷装残り', '対空残り', '耐久残り', '運', '士気', '修復時間', '鍵'];
      tbody = $('<tbody />');
      thead = $('<thead />');
      templateHeadTh = _.template($('#t-shiptable-head-th').text().trim());
      superBuffer = '';
      buffer = '';
      _.each(columnOrder, (function(_this) {
        return function(key) {
          var sortName;
          if (key === '修復時間') {
            sortName = '_docktime';
          } else if (key === '艦隊') {
            sortName = '艦隊番号';
          } else if (key === '次Lv') {
            sortName = '次Lv数値';
          } else {
            sortName = key;
          }
          return buffer += templateHeadTh({
            headLabel: key,
            sortName: sortName,
            sortKey: _this.displayOptions.sort,
            isInverted: _this.displayOptions.invert
          });
        };
      })(this));
      superBuffer += "<tr>" + buffer + "</tr>";
      $(superBuffer).appendTo(thead);
      superBuffer = '';
      _.each(shipTable, function(ship, i) {
        buffer = '';
        _.each(columnOrder, function(key) {
          return buffer += "<td>" + ship[key] + "</td>";
        });
        return superBuffer += "<tr>" + buffer + "</tr>";
      });
      $(superBuffer).appendTo(tbody);
      return this.renderShipTable(tbody, thead);
    },
    renderShipTable: function(tbody, thead) {
      var outletTable, outletTableSticky;
      outletTable = $('<table />').addClass('output-table static-body').attr({
        id: 'ship-table'
      });
      outletTableSticky = $('<table />').addClass('output-table sticky-header').attr({
        id: 'ship-table-sticky'
      });
      outletTable.append(thead, tbody);
      $('#mother-table').closest('.output').addClass('show');
      $('#mother-table').html(outletTable).css({
        height: outletTable.outerHeight()
      });
      tbody.addClass('show');
      outletTableSticky.append(thead.clone()).appendTo('#mother-table');
      this.scrollWindow('dummy');
      this.overlay(false);
      return setTimeout((function(_this) {
        return function() {
          return _this.adjustStickyWidth();
        };
      })(this), 100);
    },
    adjustStickyWidth: function() {
      var outletTable, outletTableSticky, staticTh, stickyTh;
      outletTable = $('.output-table.static-body');
      outletTableSticky = $('.output-table.sticky-header');
      staticTh = outletTable.find('thead th');
      stickyTh = outletTableSticky.find('thead th');
      staticTh.each(function(i) {
        var $this;
        $this = $(this);
        return $this.css({
          width: 'auto'
        });
      });
      return staticTh.each(function(i) {
        var $this;
        $this = $(this);
        $this.css({
          width: $this.width()
        });
        return stickyTh.eq(i).css({
          width: $this.width()
        });
      });
    },
    clickSort: function(e) {
      var elm, sortKey;
      elm = $(e.currentTarget);
      sortKey = elm.data('sort');
      if (sortKey === this.displayOptions.sort) {
        this.displayOptions.invert = !this.displayOptions.invert;
      } else {
        this.displayOptions.invert = false;
      }
      this.displayOptions.sort = elm.data('sort');
      return this.generateMotherTable();
    },
    clickLevelFilter: function(e) {
      var elm;
      elm = $(e.currentTarget);
      $('.level-filter').addClass('enabled');
      elm.prevAll('.level-filter').removeClass('enabled');
      this.displayOptions.levelThreshold = elm.data('threshold');
      return this.generateMotherTable();
    },
    applySortAndFilter: function(shipTable) {
      var options, _shipTable;
      _shipTable = _.clone(shipTable);
      options = this.displayOptions;
      if (options.sort !== 'No') {
        _shipTable = _.sortBy(_shipTable, function(ship) {
          return ship.No;
        });
      }
      _shipTable = _.sortBy(_shipTable, function(ship) {
        return ship[options.sort];
      });
      if (options.invert) {
        _shipTable = _shipTable.reverse();
      }
      _shipTable = _.reject(_shipTable, function(ship) {
        return ship.Lv < options.levelThreshold;
      });
      return _shipTable;
    },
    renderFleetList: function() {
      var dl, section, templateDeckdetailEachship, templateDeckdetailList, templateDeckdetailTextEachship, templateDecksummaryContent, templateDecksummaryEachship, templateDecksummaryHead, templateDecksummaryList, templateDecksummaryTextContent, templateDecksummaryTextEachship;
      section = $('.fleet-equipdetails').empty();
      dl = $('<dl />').attr({
        id: 'fleet-list'
      });
      templateDecksummaryTextEachship = _.template($('#t-decksummary-text-eachship').text().trim());
      templateDecksummaryEachship = _.template($('#t-decksummary-eachship').text().trim());
      templateDecksummaryHead = _.template($('#t-decksummary-head').text().trim());
      templateDecksummaryTextContent = _.template($('#t-decksummary-text-content').text().trim());
      templateDecksummaryContent = _.template($('#t-decksummary-content').text().trim());
      templateDecksummaryList = _.template($('#t-decksummary-list').text().trim());
      templateDeckdetailTextEachship = _.template($('#t-deckdetail-text-eachship').text().trim());
      templateDeckdetailEachship = _.template($('#t-deckdetail-eachship').text().trim());
      templateDeckdetailList = _.template($('#t-deckdetail-list').text().trim());
      _.each(this.analyzedFleet, (function(_this) {
        return function(fleet, fNumber) {
          var dd, fleetNumber, fleetShipsCount, li, scout, textBuffer, textBuffer2, textHead, totalAirMastery, ul, ul2;
          fleetNumber = fNumber + 1;
          textBuffer = [];
          textBuffer2 = [];
          dl.append($(templateDecksummaryHead({
            fleetNumber: fleetNumber,
            fleetName: fleet.name
          })));
          ul = $(templateDecksummaryList({
            fleetNumber: fleetNumber
          }));
          ul2 = $(templateDeckdetailList({
            fleetNumber: fleetNumber
          }));
          totalAirMastery = 0;
          scout = {
            艦隊総計: 0,
            素体合計: 0,
            装備合計: 0,
            特殊計算総計: 0
          };
          _.each(fleet.ships, function(ship, shipNumber) {
            var equipNames;
            if (ship === void 0) {
              return true;
            }
            equipNames = [];
            _.each(ship._equipObj, function(equip) {
              if (equip.id !== -1) {
                return equipNames.push(equip.name);
              }
            });
            if (equipNames.length === 0) {
              equipNames = ['∅'];
            }
            totalAirMastery += ship.制空値;
            scout.艦隊総計 += ship.索敵値;
            scout.素体合計 += ship.スペック.索敵.素体;
            scout.装備合計 += ship.スペック.索敵.装備特殊補正;
            ul.append($(templateDecksummaryEachship({
              isFlagship: shipNumber === 0,
              type: ship.艦種,
              name: ship.艦名,
              level: ship.Lv,
              condition: ship.士気
            })));
            ul2.append($(templateDeckdetailEachship({
              isFlagship: shipNumber === 0,
              name: ship.艦名,
              level: ship.Lv,
              equipments: equipNames.join('、')
            })));
            textBuffer.push(templateDecksummaryTextEachship({
              isFlagship: shipNumber === 0,
              type: ship.艦種,
              name: ship.艦名,
              level: ship.Lv,
              condition: ship.士気
            }));
            return textBuffer2.push(templateDeckdetailTextEachship({
              isFlagship: shipNumber === 0,
              name: ship.艦名,
              level: ship.Lv,
              equipments: equipNames.join('、')
            }));
          });
          fleetShipsCount = _.compact(fleet.ships).length;
          if (fleetShipsCount === 0) {
            li = $('<li />').append("<span class=" + "ship-type" + ">なし</span>");
            li.appendTo(ul);
            li.appendTo(ul2);
          }
          scout.特殊計算総計 = Math.floor(Math.sqrt(scout.素体合計) + scout.装備合計);
          dd = $(templateDecksummaryContent({
            fleetNumber: fleetNumber,
            totalAirMastery: totalAirMastery,
            totalScout: scout.艦隊総計,
            totalWeirdScout: scout.特殊計算総計
          }));
          textHead = templateDecksummaryTextContent({
            fleetNumber: fleetNumber,
            totalAirMastery: totalAirMastery,
            totalScout: scout.艦隊総計,
            totalWeirdScout: scout.特殊計算総計
          });
          ul.appendTo(dd);
          ul2.appendTo(dd);
          dd.appendTo(dl);
          textBuffer.unshift(textHead);
          textBuffer2.unshift(textHead);
          _this.analyzedFleetText.summary[fleetNumber] = textBuffer.join('\n');
          _this.analyzedFleetText.detailed[fleetNumber] = textBuffer2.join('\n');
          return dd.css({
            height: fleetShipsCount * 25 + 30
          });
        };
      })(this));
      $('#fleet-summary').closest('.output').addClass('show');
      $('#fleet-summary').html(dl).css({
        height: dl.outerHeight()
      });
      return dl.addClass('show');
    },
    clickFleetHead: function(e) {
      var elm, fleetNumber;
      elm = $(e.currentTarget);
      fleetNumber = elm.data('fleet');
      return $("dt.fleet-" + fleetNumber + ", dd.fleet-" + fleetNumber).toggleClass('tweaken');
    },
    clickFleetDiscription: function(e) {
      var copyArea, copyDiv, elm, err, fleetNumber, isSuccessful, isSupported, output;
      elm = $(e.currentTarget).closest('.fleet-info');
      fleetNumber = elm.data('fleet');
      if (elm.hasClass('tweaken')) {
        output = this.analyzedFleetText.detailed[fleetNumber];
      } else {
        output = this.analyzedFleetText.summary[fleetNumber];
      }
      copyArea = $('<textarea />').text(output).addClass('copy').attr({
        rows: 7
      });
      copyDiv = $('<div />').addClass('copy-wrapper').append(copyArea);
      elm.append(copyDiv);
      isSupported = document.queryCommandSupported('cut');
      if (!isSupported) {
        return;
      }
      copyArea.get(0).select();
      try {
        isSuccessful = document.execCommand('cut');
        if (isSuccessful) {
          this.notify('Copied!');
        }
      } catch (_error) {
        err = _error;
        console.log('Unable to copy.');
      }
      return copyDiv.remove();
    },
    distinguishShipyomiWithShiptype: function(ship, shipType, yomiKey) {
      var _ref;
      if ((_ref = ship[yomiKey]) === "ちとせ" || _ref === "ちよだ") {
        ship[yomiKey] = "" + ship[yomiKey] + "・" + shipType;
      } else if (ship[yomiKey] === "たいげい・りゅうほう") {
        if (shipType === "潜水母艦") {
          ship[yomiKey] = "たいげい・" + shipType;
        } else if (shipType === "軽空母") {
          ship[yomiKey] = "りゅうほう・" + shipType;
        }
      }
      return ship;
    },
    detectNonownedShips: function(myShips, baseShips) {
      var allImplemented, outletShips, ownedShipYomi, shipTypes;
      myShips = this.reduceKeyPrefixes(CIC.transactions.myShips);
      baseShips = CIC.masters.ships;
      shipTypes = CIC.masters.shipTypes;
      baseShips = _.each(baseShips, (function(_this) {
        return function(base) {
          return _this.distinguishShipyomiWithShiptype(base, shipTypes[base.stype].name, 'yomi');
        };
      })(this));
      baseShips = _.reject(baseShips, function(base) {
        if (base.sortno === 0) {
          return true;
        }
      });
      allImplemented = _.groupBy(baseShips, function(base) {
        return base.yomi;
      });
      allImplemented = _.keys(allImplemented);
      CIC.statistics.allImplemented = allImplemented;
      console.log("実装済み全艦の一覧");
      console.log(allImplemented);
      ownedShipYomi = [];
      _.each(myShips, function(ship) {
        return baseShips = _.reject(baseShips, function(base) {
          if (base.id === ship.ship_id) {
            ownedShipYomi.push(base.yomi);
            return true;
          }
        });
      });
      _.each(ownedShipYomi, function(yomi) {
        return baseShips = _.reject(baseShips, function(base) {
          return base.yomi === yomi;
        });
      });
      baseShips = _.groupBy(baseShips, function(base) {
        return base.yomi;
      });
      outletShips = [];
      _.each(baseShips, function(ships, yomi) {
        var groupName, nonOwned;
        ships = _.sortBy(ships, function(ship) {
          if (ship.afterlv === 0) {
            ship.afterlv = 999;
          }
          return ship.afterlv;
        });
        groupName = [];
        _.each(ships, function(ship) {
          return groupName.push(ship.name);
        });
        nonOwned = {
          name: groupName.join('/'),
          yomi: yomi,
          ships: ships
        };
        return outletShips.push(nonOwned);
      });
      return this.renderNonownedShips(outletShips);
    },
    renderNonownedShips: function(nonOwned) {
      var dd, dl, dt, li, ul;
      dl = $('<dl />').attr({
        id: 'nonowned-list'
      });
      _.each(nonOwned, function(shipGroup, key) {
        var dd, dt, li, ul;
        dt = $('<dt />').text("" + shipGroup.name + "（" + shipGroup.yomi + "）").appendTo(dl);
        ul = $('<ul />');
        _.each(shipGroup.ships, function(ship) {
          var li, shipType;
          shipType = CIC.masters.shipTypes[ship.stype];
          return li = $('<li />').append("<span class=" + "ship-type" + ">" + shipType.name + "</span>").append("<span class=" + "ship-name" + ">" + ship.name + "</span>").appendTo(ul);
        });
        if (shipGroup.ships.length === 0) {
          li = $('<li />').append("<span class=" + "ship-type" + ">なし</span>").appendTo(ul);
        }
        dd = $('<dd />');
        ul.appendTo(dd);
        return dd.appendTo(dl);
      });
      if (nonOwned.length === 0) {
        dt = $('<dt />').text("なし").appendTo(dl);
        ul = $('<ul />');
        li = $('<li />').text("なし").appendTo(ul);
        dd = $('<dd />').append(ul).appendTo(dl);
      }
      $('#nonowned-ships').closest('.output').addClass('show');
      $('#nonowned-ships').html(dl).css({
        height: dl.outerHeight()
      });
      return dl.addClass('show');
    },
    keyupEquipmentInput: function(e) {
      if (e.keyCode === 13) {
        return this.findEquipment();
      }
    },
    findEquipment: function() {
      var foundEquipmentBase, searchArray, searchText;
      if (!CIC.analyzeOut) {
        return false;
      }
      searchText = $('#search-equipment-input').val().trim();
      if (searchText === '') {
        return false;
      }
      searchArray = searchText.split(/\s/);
      foundEquipmentBase = _.clone(CIC.masters.equipments);
      _.each(searchArray, function(search) {
        var reSearch;
        reSearch = new RegExp(search, 'i');
        return foundEquipmentBase = _.filter(foundEquipmentBase, function(equip) {
          return equip.name.match(reSearch);
        });
      });
      _.map(foundEquipmentBase, (function(_this) {
        return function(eqBase) {
          var eqType, eqTypeName, ownedCount, searchId, shipHas;
          eqType = eqBase.type[2];
          eqTypeName = CIC.masters.equipmentTypes[eqType].name;
          eqBase.typeName = eqTypeName;
          eqBase.fullName = "" + eqTypeName + " :: " + eqBase.name;
          searchId = eqBase.id;
          shipHas = [];
          _.each(_this.analyzedPort, function(ship) {
            var equippedCountOnShip;
            equippedCountOnShip = 0;
            _.each(ship._equipObj, function(equip) {
              if (equip.id === eqBase.id) {
                return equippedCountOnShip++;
              }
            });
            if (equippedCountOnShip) {
              ship.搭載数 = equippedCountOnShip;
              return shipHas.push(ship);
            }
          });
          ownedCount = 0;
          _.each(CIC.transactions.myEquipments, function(myEquip) {
            if (myEquip.api_slotitem_id === eqBase.id) {
              return ownedCount++;
            }
          });
          eqBase._shipHas = shipHas;
          return eqBase._ownedCount = ownedCount;
        };
      })(this));
      return this.renderFoundEquipments(foundEquipmentBase);
    },
    renderFoundEquipments: function(founds) {
      var dl;
      dl = $('<dl />').attr({
        id: 'found-equipments-list'
      });
      _.each(founds, function(equip) {
        var dd, dt, freeEquipCount, li, shipHas, ul;
        if (equip.sortno === 0) {
          return true;
        }
        dt = $('<dt />').text(equip.fullName).appendTo(dl);
        dd = $('<dd />');
        ul = $('<ul />');
        shipHas = _.sortBy(equip._shipHas, function(ship) {
          return ship.Lv;
        });
        freeEquipCount = equip._ownedCount;
        _.each(shipHas, function(ship) {
          var li;
          li = $('<li />').append("<span class=" + "ship-count" + ">" + ship.搭載数 + "×</span>").append("<span class=" + "ship-type" + ">" + ship.艦種 + "</span>").append("<span class=" + "ship-name" + ">" + ship.艦名 + "</span>").append("<span class=" + "ship-lv" + ">Lv." + ship.Lv + "</span>").appendTo(ul);
          return freeEquipCount -= ship.搭載数;
        });
        if (equip._ownedCount !== 0) {
          li = $('<li />').append("<span class=" + "ship-count" + ">" + freeEquipCount + "×</span>").append("<span class=" + "ship-type" + ">遊離</span>").prependTo(ul);
          li = $('<li />').append("<span class=" + "ship-count" + ">" + equip._ownedCount + "×</span>").append("<span class=" + "ship-type" + ">全体</span>").prependTo(ul);
        } else {
          li = $('<li />').append("<span class=" + "ship-type" + ">なし</span>").appendTo(ul);
        }
        ul.appendTo(dd);
        return dd.appendTo(dl);
      });
      $('#search-result').closest('.output').addClass('show');
      $('#search-result').html(dl).css({
        height: dl.outerHeight()
      });
      dl.addClass('show');
      console.log("合致した装備のマスタ");
      return console.log(_.indexBy(founds, 'name'));
    },
    keyupBaseInput: function(e) {
      if (e.keyCode === 13) {
        return this.findShipBase();
      }
    },
    findShipBase: function() {
      var foundShipBase, searchArray, searchText;
      searchText = $('#base-ship-input').val().trim();
      if (searchText === '') {
        return false;
      }
      searchArray = searchText.split(/\s/);
      foundShipBase = _.clone(CIC.masters.ships);
      _.each(searchArray, function(search) {
        var reSearch;
        reSearch = new RegExp(search, 'i');
        return foundShipBase = _.filter(foundShipBase, function(ship) {
          return ship.name.match(reSearch);
        });
      });
      console.log("合致した艦マスタ");
      console.log(foundShipBase);
      if (!CIC.analyzeOut) {
        return false;
      }
      console.log("合致した所有艦");
      return _.each(foundShipBase, (function(_this) {
        return function(shipBase) {
          var foundShipInstances, searchId;
          searchId = shipBase.id;
          foundShipInstances = _.filter(_this.analyzedPort, function(ship) {
            return ship._baseId === shipBase.id;
          });
          if (foundShipInstances.length) {
            console.log("- " + shipBase.name);
            return console.log(foundShipInstances);
          }
        };
      })(this));
    },
    renderLevelChart: function() {
      var chart, data, levelObj, levelSection, options, shipCount, shipTypeNames, shipTypes, templateOverall, totalExp;
      levelSection = _.range(1, 150, 10);
      shipTypes = _.countBy(this.analyzedPort, function(ship) {
        return ship.艦種;
      });
      shipTypeNames = _.map(shipTypes, function(count, type) {
        return type;
      });
      shipTypeNames.reverse().unshift('');
      levelObj = _.map(levelSection, function(initialLevel) {
        var initCounter;
        initCounter = [];
        _(shipTypeNames.length).times(function() {
          return initCounter.push(0);
        });
        initCounter[0] = "" + initialLevel + "～";
        return initCounter;
      });
      shipCount = 0;
      totalExp = 0;
      _.each(this.analyzedPort, function(ship) {
        var sectionId, shipTypeId;
        sectionId = _.sortedIndex(levelSection, ship.Lv + 1) - 1;
        shipTypeId = _.indexOf(shipTypeNames, ship.艦種);
        levelObj[sectionId][shipTypeId]++;
        shipCount++;
        return totalExp += ship.経験値.積算;
      });
      CIC.statistics.shipCount = shipCount;
      CIC.statistics.totalExps = s.numberFormat(totalExp, 0, '.', ',');
      levelObj.unshift(shipTypeNames);
      data = google.visualization.arrayToDataTable(levelObj);
      options = {
        isStacked: true,
        connectSteps: false,
        width: 900,
        height: 500,
        selectionMode: 'multiple',
        chartArea: {
          width: '77%',
          height: '91%',
          top: 20,
          left: 50
        },
        hAxis: {
          textStyle: {
            fontSize: 12
          }
        },
        colors: ['#028e9b', '#4374e0', '#53a8fb', '#f1ca3a', '#e49307', '#000000', '#888888', '#cccccc', '#ff7800']
      };
      chart = new google.visualization.SteppedAreaChart($('#level-chart').get(0));
      chart.draw(data, options);
      templateOverall = _.template($('#t-overall-content').text().trim());
      $('#overall-stat').empty().append(templateOverall({
        shipCount: CIC.statistics.shipCount,
        distinctShipCount: CIC.statistics.allDistinctOwned,
        totalExps: CIC.statistics.totalExps,
        failedMissions: CIC.statistics.failedMissions
      }));
      return $('.level-histgram').addClass('show');
    },
    secondToHour: function(millisec, style) {
      var hour, minute, out, sec, second, units;
      sec = millisec / 1000;
      hour = parseInt(sec / 3600);
      sec = sec % 3600;
      minute = parseInt(sec / 60);
      sec = sec % 60;
      second = parseInt(sec);
      minute = s.lpad(minute, 2, '0');
      second = s.lpad(second, 2, '0');
      if (style === 'degree') {
        units = {
          h: '°',
          m: '′',
          s: '″'
        };
      } else if (style === 'colons') {
        units = {
          h: ':',
          m: ':',
          s: ''
        };
      } else {
        units = {
          h: '時間',
          m: '分',
          s: '秒'
        };
      }
      out = [];
      if (hour > 0) {
        out.push(hour);
        out.push(units.h);
      }
      if (minute > 0 || hour > 0) {
        out.push(minute);
        out.push(units.m);
      }
      if (minute > 0 || hour > 0 || second > 0) {
        out.push(second);
        out.push(units.s);
      }
      return out.join('');
    },
    scrollWindow: function(e) {
      var normal, sticky;
      if (!CIC.analyzeOut) {
        return false;
      }
      normal = $('#ship-table');
      sticky = $('#ship-table-sticky');
      return _.debounce(function() {
        var limit, scrolled, threshold;
        threshold = normal.offset().top;
        limit = threshold + normal.outerHeight();
        scrolled = $('body').scrollTop();
        if (limit < scrolled) {
          sticky.removeClass('hold').css({
            top: 0
          });
          return normal.removeClass('hold');
        } else if (threshold < scrolled) {
          sticky.addClass('hold').stop().css({
            top: scrolled
          });
          return normal.addClass('hold');
        } else {
          sticky.removeClass('hold').css({
            top: 0
          });
          return normal.removeClass('hold');
        }
      }, 50)();
    },
    numberDrum: function($elm, to, duration) {
      var allSteps, diff, easingFunction, from, interval, next, repeater, startTime, step;
      interval = 40;
      step = 0;
      next = from = parseInt($elm.text(), 10);
      diff = to - from;
      allSteps = duration / interval;
      easingFunction = function(progress) {
        var argv, result;
        argv = (progress - 1) * 3;
        result = Math.pow(argv, 3);
        return result / 27 + 1;
      };
      startTime = +new Date();
      repeater = setInterval(function() {
        var passedTime, progress, value;
        passedTime = new Date() - startTime;
        progress = Math.min(passedTime / duration, 1);
        value = from + diff * easingFunction(progress);
        return $elm.text(parseInt(value, 10));
      }, interval);
      return setTimeout(function() {
        clearInterval(repeater);
        return $elm.text(parseInt(to, 10));
      }, duration + 100);
    },
    overlay: function(announcement) {
      var layer;
      layer = function() {
        if (announcement) {
          return this.set(announcement);
        } else {
          return this.unset();
        }
      };
      layer.prototype.set = function(announcement) {
        var hOffset, loader, overlay, vOffset;
        loader = $('<div />').addClass('loader').attr('id', 'loader').text(announcement).prependTo('body');
        vOffset = ($(window).height() - loader.outerHeight()) / 2;
        hOffset = ($(window).width() - loader.outerWidth()) / 2;
        $('#loader').css({
          top: vOffset,
          left: hOffset,
          position: 'fixed'
        });
        overlay = $('<div />').addClass('overlay').attr({
          id: 'overlay',
          onClick: 'javascript: return false;'
        }).css({
          height: $(document).height()
        });
        return $('body').prepend(overlay);
      };
      layer.prototype.unset = function() {
        return $('#overlay, #loader').remove();
      };
      return new layer();
    },
    notify: function(message) {
      var hOffset, notification, statement, vOffset;
      statement = $('<p />').addClass('notification-statement').text(message);
      notification = $('<div />').append(statement).addClass('fullscreen-notification').prependTo('body');
      vOffset = ($(window).height() - statement.outerHeight()) / 2;
      hOffset = ($(window).width() - statement.outerWidth()) / 2;
      statement.css({
        top: vOffset,
        left: hOffset
      });
      notification.addClass('readable');
      return setTimeout(function() {
        notification.addClass('flush');
        return setTimeout(function() {
          return notification.remove();
        }, 630);
      }, 400);
    }
  });
  return anbk = new deuteriumCIC();
});

//# sourceMappingURL=data:application/json;base64,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QSxTQUNDLENBQUMsR0FERixDQUNNO0FBQUEsUUFBQyxHQUFBLEVBQUssT0FBTjtBQUFBLFFBQWUsSUFBQSxFQUFNLE9BQXJCO09BRE4sQ0FYQSxDQUFBO0FBQUEsTUFlQSxZQUFZLENBQUMsUUFBYixDQUFzQixVQUF0QixDQWZBLENBQUE7YUFnQkEsVUFBQSxDQUFXLFNBQUEsR0FBQTtBQUVULFFBQUEsWUFBWSxDQUFDLFFBQWIsQ0FBc0IsT0FBdEIsQ0FBQSxDQUFBO2VBQ0EsVUFBQSxDQUFXLFNBQUEsR0FBQTtpQkFDVCxZQUFZLENBQUMsTUFBYixDQUFBLEVBRFM7UUFBQSxDQUFYLEVBRUcsR0FGSCxFQUhTO01BQUEsQ0FBWCxFQU1HLEdBTkgsRUFuQk87SUFBQSxDQXZwQ1I7R0FKYyxDQURmLENBQUE7U0EwckNBLElBQUEsR0FBVyxJQUFBLFlBQUEsQ0FBQSxFQTNyQ1Y7QUFBQSxDQUFGLENBWEEsQ0FBQSIsImZpbGUiOiJhcHBsaWNhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIiMjI1xyXG4jIERldXRlcml1bUNJQyBiYXNlbGluZTUgbW9kLjBcclxuIyBiYXNlbGluZTE6IG9ubHkgYWxpZ25pbmcgLyB0YWJsZSByZW5kZXJpbmdcclxuIyBiYXNlbGluZTI6IGNhbGN1bGF0aW5nLCBhbmFseXppbmcsIHNlYXJjaGluZ1xyXG4jIGJhc2VsaW5lMzogc3RpY2tpZXMsIGFuaW1hdGlvbnMsIGZpbHRlcmluZ1xyXG4jIGJhc2VsaW5lNDogdG90YWxseSBjb2ZmZWxpemVkIGFuZCByZWZhY3RvcmVkXHJcbiMgYmFzZWxpbmU1OiBhdXRvY29weVxyXG4jIHJvYWRtYXBzOiBzY291dCBjYWxjLCBlcXVpcGRldGFpbHMsIHNoaXBkZXRhaWwgZXhwYW5kLCBleHRlbnNpb25pemUsIGZsZWV0MnRhYmxlXHJcbiMjI1xyXG5cclxuZ29vZ2xlLmxvYWQoXCJ2aXN1YWxpemF0aW9uXCIsIFwiMVwiLCB7cGFja2FnZXM6W1wiY29yZWNoYXJ0XCJdfSlcclxuJCAtPlxyXG5cdCd1c2Ugc3RyaWN0J1xyXG5cdGRldXRlcml1bUNJQyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDlrprnvqnnialcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRlbDogJyNkY2ljJ1xyXG5cdFx0anNvbjpcclxuXHRcdFx0c2hpcHM6IHt9XHJcblx0XHRcdGVxdWlwbWVudHM6IHt9XHJcblx0XHRiYXNlOlxyXG5cdFx0XHRzaGlwczoge31cclxuXHRcdFx0c2hpcFR5cGVzOiB7fVxyXG5cdFx0XHRlcXVpcG1lbnRzOiB7fVxyXG5cdFx0XHRpdGVtczoge31cclxuXHRcdGFuYWx5emVkUG9ydDoge31cclxuXHRcdGFuYWx5emVkRmxlZXQ6IHt9XHJcblx0XHRhbmFseXplZEZsZWV0VGV4dDpcclxuXHRcdFx0c3VtbWFyeToge31cclxuXHRcdFx0ZGV0YWlsZWQ6IHt9XHJcblx0XHRkaXNwbGF5T3B0aW9uczpcclxuXHRcdFx0c29ydDogJ05vJ1xyXG5cdFx0XHRpbnZlcnQ6IGZhbHNlXHJcblx0XHRcdGxldmVsVGhyZXNob2xkOiAwXHJcblx0XHRldmVudHM6XHJcblx0XHRcdCdjbGljayAjYW5hbHl6ZSc6ICdjbGlja0FuYWx5emUnXHJcblx0XHRcdCdjbGljayAjc2VhcmNoLWVxdWlwbWVudC1idXR0b24nOiAnZmluZEVxdWlwbWVudCdcclxuXHRcdFx0J2tleXVwICNzZWFyY2gtZXF1aXBtZW50LWlucHV0JzogJ2tleXVwRXF1aXBtZW50SW5wdXQnXHJcblx0XHRcdCdjbGljayAjYmFzZS1zaGlwLWJ1dHRvbic6ICdmaW5kU2hpcEJhc2UnXHJcblx0XHRcdCdrZXl1cCAjYmFzZS1zaGlwLWlucHV0JzogJ2tleXVwQmFzZUlucHV0J1xyXG5cdFx0XHQnY2xpY2sgLnNoaXAtdGFibGUtc29ydGVyJzogJ2NsaWNrU29ydCdcclxuXHRcdFx0J2NsaWNrIC5sZXZlbC1maWx0ZXInOiAnY2xpY2tMZXZlbEZpbHRlcidcclxuXHRcdFx0J2NsaWNrIGR0LmZsZWV0LWluZm8nOiAnY2xpY2tGbGVldEhlYWQnXHJcblx0XHRcdCdjbGljayBkZC5mbGVldC1pbmZvIHVsJzogJ2NsaWNrRmxlZXREaXNjcmlwdGlvbidcclxuXHRcdHN0YXR1c0FjY2Vzc29yOiBbXHJcblx0XHRcdHtpbmRleDogMCwgaXNJbXByb3ZhYmxlOiB0cnVlLCBkc3BOYW1lOiAn54Gr5YqbJywgdmFyTmFtZU9uU2hpcDogJ2thcnlva3UnLCB2YXJOYW1lT25FcXVpcDogJ2hvdWcnfVxyXG5cdFx0XHR7aW5kZXg6IDEsIGlzSW1wcm92YWJsZTogdHJ1ZSwgZHNwTmFtZTogJ+mbt+ijhScsIHZhck5hbWVPblNoaXA6ICdyYWlzb3UnLCB2YXJOYW1lT25FcXVpcDogJ3JhaWcnfVxyXG5cdFx0XHR7aW5kZXg6IDIsIGlzSW1wcm92YWJsZTogdHJ1ZSwgZHNwTmFtZTogJ+WvvuepuicsIHZhck5hbWVPblNoaXA6ICd0YWlrdScsIHZhck5hbWVPbkVxdWlwOiAndHlrdSd9XHJcblx0XHRcdHtpbmRleDogMywgaXNJbXByb3ZhYmxlOiB0cnVlLCBkc3BOYW1lOiAn6ICQ5LmFJywgdmFyTmFtZU9uU2hpcDogJ3NvdWtvdScsIHZhck5hbWVPbkVxdWlwOiAnc291ayd9XHJcblx0XHRcdHtpbmRleDogNCwgaXNJbXByb3ZhYmxlOiB0cnVlLCBkc3BOYW1lOiAn6YGLJywgdmFyTmFtZU9uU2hpcDogJ2x1Y2t5JywgdmFyTmFtZU9uRXF1aXA6ICdsdWNrJ31cclxuXHRcdFx0e2luZGV4OiA1LCBpc0ltcHJvdmFibGU6IGZhbHNlLCBkc3BOYW1lOiAn5a++5r2cJywgdmFyTmFtZU9uU2hpcDogJ3RhaXNlbicsIHZhck5hbWVPbkVxdWlwOiAndGFpcyd9XHJcblx0XHRcdHtpbmRleDogNiwgaXNJbXByb3ZhYmxlOiBmYWxzZSwgZHNwTmFtZTogJ+e0ouaVtScsIHZhck5hbWVPblNoaXA6ICdzYWt1dGVraScsIHZhck5hbWVPbkVxdWlwOiAnc2FrdSd9XHJcblx0XHRcdHtpbmRleDogNywgaXNJbXByb3ZhYmxlOiBmYWxzZSwgZHNwTmFtZTogJ+WwhOeoiycsIHZhck5hbWVPblNoaXA6ICdsZW5nJywgdmFyTmFtZU9uRXF1aXA6ICdsZW5nJ31cclxuXHRcdFx0e2luZGV4OiA4LCBpc0ltcHJvdmFibGU6IGZhbHNlLCBkc3BOYW1lOiAn5Zue6YG/JywgdmFyTmFtZU9uU2hpcDogJ2thaWhpJywgdmFyTmFtZU9uRXF1aXA6ICdob3VrJ31cclxuXHRcdFx0IyB7aW5kZXg6IDksIGlzSW1wcm92YWJsZTogZmFsc2UsIGRzcE5hbWU6ICfniIboo4UnLCB2YXJOYW1lT25TaGlwOiBudWxsLCB2YXJOYW1lT25FcXVpcDogJ2Jha3UnfVxyXG5cdFx0XHQjIHtpbmRleDogMTAsIGlzSW1wcm92YWJsZTogZmFsc2UsIGRzcE5hbWU6ICflkb3kuK0nLCB2YXJOYW1lT25TaGlwOiBudWxsLCB2YXJOYW1lT25FcXVpcDogJ2hvdW0nfVxyXG5cdFx0XVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDliJ3mnJ/ljJZcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRpbml0aWFsaXplOiAtPlxyXG5cdFx0XHQjIENJQ+WIneacn+WMllxyXG5cdFx0XHRDSUMuYW5hbHl6ZU91dCA9IGZhbHNlXHJcblx0XHRcdENJQy5zdGF0aXN0aWNzID1cclxuXHRcdFx0XHQnYWxsSW1wbGVtZW50ZWQnOiAwXHJcblx0XHRcdFx0J2FsbERpc3RpbmN0T3duZWQnOiAwXHJcblx0XHRcdFx0J3NoaXBDb3VudCc6IDBcclxuXHRcdFx0XHQndG90YWxFeHBzJzogMFxyXG5cdFx0XHRcdCdmYWlsZWRNaXNzaW9ucyc6IDBcclxuXHJcblx0XHRcdEBmb3JtYXRNYXN0ZXJzKClcclxuXHRcdFx0QGZvcm1hdFRyYW5zYWN0aW9ucygpXHJcblx0XHRcdCQod2luZG93KS5zY3JvbGwgQHNjcm9sbFdpbmRvd1xyXG5cdFx0XHQkKHdpbmRvdykucmVzaXplIF8uZGVib3VuY2UgLT5cclxuXHRcdFx0XHRAYWRqdXN0U3RpY2t5V2lkdGhcclxuXHRcdFx0LCA1MFxyXG5cclxuXHRcdFx0c2hpcCA9ICQoJyNwb3J0LWlucHV0JykudmFsKClcclxuXHRcdFx0aWYgc2hpcFxyXG5cdFx0XHRcdCQoJyNwb3J0LWlucHV0JykudmFsKHNoaXAudHJpbSgpKVxyXG5cclxuXHRcdFx0Xy5iaW5kQWxsIEAsICdhbmFseXplU2hpcHMnLCAnc3RhcnRBbmFseXplJ1xyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDlrprnvqnpoZ7jga7jg4fjg7zjgr/mp4vpgKDjgpLlho3jg5Xjgqnjg7zjg57jg4Pjg4jjgZnjgotcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRmb3JtYXRNYXN0ZXJzOiAtPlxyXG5cdFx0XHQjIOWFqOWumue+qeOBq+OBpOOBhOOBpuOCpOODs+ODh+ODg+OCr+OCueOCkuS7mOWKoOOBmeOCi1xyXG5cdFx0XHRDSUMubWFzdGVycyA9IHt9XHJcblx0XHRcdENJQy5tYXN0ZXJzLnNoaXBzID0gXy5pbmRleEJ5IChAcmVkdWNlS2V5UHJlZml4ZXMgQ0lDLl9tYXN0ZXJzLmFwaV9tc3Rfc2hpcCksICdpZCdcclxuXHRcdFx0Q0lDLm1hc3RlcnMuc2hpcFR5cGVzID0gXy5pbmRleEJ5IChAcmVkdWNlS2V5UHJlZml4ZXMgQ0lDLl9tYXN0ZXJzLmFwaV9tc3Rfc3R5cGUpLCAnaWQnXHJcblx0XHRcdENJQy5tYXN0ZXJzLmVxdWlwbWVudHMgPSBfLmluZGV4QnkgKEByZWR1Y2VLZXlQcmVmaXhlcyBDSUMuX21hc3RlcnMuYXBpX21zdF9zbG90aXRlbSksICdpZCdcclxuXHRcdFx0Q0lDLm1hc3RlcnMuZXF1aXBtZW50VHlwZXMgPSBfLmluZGV4QnkgKEByZWR1Y2VLZXlQcmVmaXhlcyBDSUMuX21hc3RlcnMuYXBpX21zdF9zbG90aXRlbV9lcXVpcHR5cGUpLCAnaWQnXHJcblx0XHRcdENJQy5tYXN0ZXJzLml0ZW1zID0gXy5pbmRleEJ5IChAcmVkdWNlS2V5UHJlZml4ZXMgQ0lDLl9tYXN0ZXJzLmFwaV9tc3RfdXNlaXRlbSksICdpZCdcclxuXHRcdFx0Q0lDLm1hc3RlcnMuZXhwdGFibGUgPSBDSUMuX21hc3RlcnMuYXBpX21zdF9leHB0YWJsZVxyXG5cclxuXHRcdFx0IyDkvovlpJblgKTnlKjjga7jg4Djg5/jg7zoo4Xlgpnjg4fjg7zjgr/jgpLlrprnvqlcclxuXHRcdFx0Q0lDLm1hc3RlcnMubnVsbEVxdWlwbWVudCA9XHJcblx0XHRcdFx0YXRhcDogMCwgYmFrazogMCwgYmFrdTogMCwgaG91ZzogMCwgaG91azogMCwgaG91bTogMCwgaWQ6IC0xLCBpbmZvOiBcIlwiLCBsZW5nOiAwLCBsdWNrOiAwLCByYWlnOiAwLCByYWlrOiAwLCByYWltOiAwLCByYXJlOiAwLCBzYWtiOiAwLCBzYWt1OiAwLCBzb2t1OiAwLCBzb3J0bm86IDAsIHNvdWs6IDAsIHRhaWs6IDAsIHRhaXM6IDAsIHR5a3U6IDAsIHR5cGU6IFswLDAsMCwwXSwgbmFtZTogXCLiiIVcIlxyXG5cdFx0XHRDSUMubWFzdGVycy51bmRlZmluZWRFcXVpcG1lbnQgPVxyXG5cdFx0XHRcdGF0YXA6IDAsIGJha2s6IDAsIGJha3U6IDAsIGhvdWc6IDAsIGhvdWs6IDAsIGhvdW06IDAsIGlkOiAtMSwgaW5mbzogXCJcIiwgbGVuZzogMCwgbHVjazogMCwgcmFpZzogMCwgcmFpazogMCwgcmFpbTogMCwgcmFyZTogMCwgc2FrYjogMCwgc2FrdTogMCwgc29rdTogMCwgc29ydG5vOiAwLCBzb3VrOiAwLCB0YWlrOiAwLCB0YWlzOiAwLCB0eWt1OiAwLCB0eXBlOiBbMCwwLDAsMF0sIG5hbWU6IFwidW5kZWZcIlxyXG5cclxuXHRcdFx0Y29uc29sZS5sb2cgXCLlhajjg57jgrnjgr/jg7vjg4jjg6njg7Pjgrbjgq/jgrfjg6fjg7NcIlxyXG5cdFx0XHRjb25zb2xlLmxvZyBDSUNcclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMgQVBJ44OH44O844K/44Gu6Kqt44G/6L6844G/77yI5pqr5a6a77yJXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0Zm9ybWF0VHJhbnNhY3Rpb25zOiAtPlxyXG5cdFx0XHQjIOWFqOWumue+qeOBq+OBpOOBhOOBpuOCpOODs+ODh+ODg+OCr+OCueOCkuS7mOWKoOOBmeOCi1xyXG5cdFx0XHRDSUMudHJhbnNhY3Rpb25zID0ge31cclxuXHRcdFx0Q0lDLnRyYW5zYWN0aW9ucy5tZSA9IENJQy5fdHJhbnNhY3Rpb25zLmFwaV9iYXNpY1xyXG5cdFx0XHRDSUMudHJhbnNhY3Rpb25zLm15U2hpcHMgPSBfLmluZGV4QnkgQ0lDLl90cmFuc2FjdGlvbnMuYXBpX3NoaXAsICdhcGlfaWQnXHJcblx0XHRcdENJQy50cmFuc2FjdGlvbnMubXlGbGVldHMgPSBfLmluZGV4QnkgQ0lDLl90cmFuc2FjdGlvbnMuYXBpX2RlY2tfcG9ydCwgJ2FwaV9pZCdcclxuXHRcdFx0Q0lDLnRyYW5zYWN0aW9ucy5teUVxdWlwbWVudHMgPSBfLmluZGV4QnkgQ0lDLl9zbG90aXRlbSwgJ2FwaV9pZCdcclxuXHRcdFx0IyDntbHoqIjlgKRcclxuXHRcdFx0Q0lDLnN0YXRpc3RpY3MuZmFpbGVkTWlzc2lvbnMgPSBDSUMudHJhbnNhY3Rpb25zLm1lLmFwaV9tc19jb3VudCAtIENJQy50cmFuc2FjdGlvbnMubWUuYXBpX21zX3N1Y2Nlc3NcclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMgb2JqZWN044Kt44O844GuYXBpX+OCkumZpOOBj1xyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdHJlZHVjZUtleVByZWZpeGVzOiAob2JqKS0+XHJcblx0XHRcdG9iaiA9IF8ubWFwIG9iaiwgKGRhdGEpLT5cclxuXHRcdFx0XHRrZXlzID0gXy5tYXAgXy5rZXlzKGRhdGEpLCAoa2V5KS0+XHJcblx0XHRcdFx0XHRrZXkucmVwbGFjZSAvXmFwaV8vLCAnJ1xyXG5cdFx0XHRcdF8ub2JqZWN0IGtleXMsIF8udmFsdWVzKGRhdGEpXHJcblx0XHRcdG9ialxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDop6PmnpDjg5zjgr/jg7PjgpLjgq/jg6rjg4Pjgq9cclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRjbGlja0FuYWx5emU6IC0+XHJcblx0XHRcdEBvdmVybGF5ICdhbmFseXppbmcuLi4nXHJcblxyXG5cdFx0XHQjIGRlZmVy44Gr44KI44KKb3ZlcmxheeOBqOS4puWIl+OBl+OBn+ODjuODs+ODluODreODg+OCreODs+OCsOOBqueUu+mdouabtOaWsOOCkuWun+ePvuOBmeOCi1xyXG5cdFx0XHRfLmRlZmVyIEBzdGFydEFuYWx5emVcclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMg6Kej5p6Q44K544K/44O844OIXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0c3RhcnRBbmFseXplOiAtPlxyXG5cdFx0XHQjIC8vIHZhciBlcXVpcG1lbnQgPSAkKCcjZXF1aXBtZW50LWlucHV0JykudmFsKClcclxuXHRcdFx0IyAvLyBlcXVpcG1lbnQgPSBlcXVpcG1lbnQgPyBlcXVpcG1lbnQubWF0Y2goL1xcey4rXFx9LykgOiAne30nXHJcblx0XHRcdCMgLy8gQGpzb24uZXF1aXBtZW50cyA9ICQucGFyc2VKU09OKGVxdWlwbWVudCkuYXBpX2RhdGFcclxuXHRcdFx0c2hpcCA9ICQoJyNwb3J0LWlucHV0JykudmFsKClcclxuXHRcdFx0aWYgc2hpcFxyXG5cdFx0XHRcdHNoaXAgPSBpZiBzaGlwIHRoZW4gc2hpcC5tYXRjaCAvXFx7LitcXH0vIGVsc2UgJ3t9J1xyXG5cdFx0XHRcdENJQy5fdHJhbnNhY3Rpb25zID0gJC5wYXJzZUpTT04oc2hpcCkuYXBpX2RhdGFcclxuXHRcdFx0XHRAZm9ybWF0VHJhbnNhY3Rpb25zKClcclxuXHJcblx0XHRcdF8uZGVmZXIgQGFuYWx5emVTaGlwc1xyXG5cdFx0XHRAb3ZlcmxheSBmYWxzZVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDoiaboiYfkuIDopqfjgpLmlbTlvaJcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRhbmFseXplU2hpcHM6IC0+XHJcblx0XHRcdG91dGxldFNoaXBzID0gW11cclxuXHJcblx0XHRcdCMg44OH44O844K/44OV44Kp44O844Oe44OD44OI44GX44Gm44K544Kz44O844OX5aSJ5pWw44Gr5qC857SNXHJcblx0XHRcdG15U2hpcHMgPSBAcmVkdWNlS2V5UHJlZml4ZXMgQ0lDLnRyYW5zYWN0aW9ucy5teVNoaXBzXHJcblx0XHRcdG15RXF1aXBzID0gQHJlZHVjZUtleVByZWZpeGVzIENJQy50cmFuc2FjdGlvbnMubXlFcXVpcG1lbnRzXHJcblx0XHRcdG15RmxlZXRzID0gQHJlZHVjZUtleVByZWZpeGVzIENJQy50cmFuc2FjdGlvbnMubXlGbGVldHNcclxuXHRcdFx0YmFzZVNoaXBzID0gQ0lDLm1hc3RlcnMuc2hpcHNcclxuXHRcdFx0YmFzZUVxdWlwcyA9IENJQy5tYXN0ZXJzLmVxdWlwbWVudHNcclxuXHRcdFx0bXlFcXVpcHMgPSBfLmluZGV4QnkgbXlFcXVpcHMsICdpZCdcclxuXHJcblx0XHRcdCMg5LiA6Zq744Ga44Gk5Zue44GX44Gm5Ye65Yqb44Kq44OW44K444Kn44Kv44OI44KS55Sf5oiQ44GZ44KLXHJcblx0XHRcdF8uZWFjaCBteVNoaXBzLCAoc2hpcCwgaSk9PlxyXG5cdFx0XHRcdG91dGxldCA9IHN0YXR1cyA9IHt9XHJcblx0XHRcdFx0c2hpcFBrZXkgPSBzaGlwLmlkXHJcblx0XHRcdFx0c2hpcElkID0gc2hpcC5zaGlwX2lkXHJcblx0XHRcdFx0b25zbG90cyA9IHNoaXAuc2xvdFxyXG5cdFx0XHRcdGJhc2VTaGlwID0gYmFzZVNoaXBzW3NoaXBJZF1cclxuXHJcblx0XHRcdFx0IyDoiabnqK7jgpJqb2lu44GZ44KLXHJcblx0XHRcdFx0c2hpcFR5cGVJZCA9IGJhc2VTaGlwLnN0eXBlXHJcblx0XHRcdFx0c2hpcFR5cGUgPSBDSUMubWFzdGVycy5zaGlwVHlwZXNbc2hpcFR5cGVJZF1cclxuXHJcblx0XHRcdFx0IyDoo4XlgpnjgpJqb2lu44GZ44KLXHJcblx0XHRcdFx0b25zbG90cyA9IF8ubWFwIG9uc2xvdHMsIChlcXVpcFBrZXkpLT5cclxuXHRcdFx0XHRcdGlmIGVxdWlwUGtleSA9PSAtMVxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gbnVsbFxyXG5cdFx0XHRcdFx0cmV0dXJuIG15RXF1aXBzW2VxdWlwUGtleV1cclxuXHRcdFx0XHRvbnNsb3RzID0gXy5tYXAgb25zbG90cywgKGVxdWlwKS0+XHJcblx0XHRcdFx0XHRpZiBlcXVpcCA9PSBudWxsXHJcblx0XHRcdFx0XHRcdHJldHVybiBDSUMubWFzdGVycy5udWxsRXF1aXBtZW50XHJcblx0XHRcdFx0XHRlbHNlIGlmIGVxdWlwID09IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gQ0lDLm1hc3RlcnMudW5kZWZpbmVkRXF1aXBtZW50XHJcblx0XHRcdFx0XHRlcXVpcElkID0gZXF1aXAuc2xvdGl0ZW1faWRcclxuXHRcdFx0XHRcdHJldHVybiBiYXNlRXF1aXBzW2VxdWlwSWRdXHJcblxyXG5cdFx0XHRcdCMg5omA5bGe6Imm6ZqKTm8u44KSam9pbuOBmeOCi1xyXG5cdFx0XHRcdCMgZmxlZXRMYWJlbFN0cmluZyA9IHswOicnLCAxOicxJywgMjonMicsIDM6JzMnLCA0Oic0J31cclxuXHRcdFx0XHRmbGVldExhYmVsU3RyaW5nID0gezA6JycsIDE6J+S4gCcsIDI6J+S6jCcsIDM6J+S4iScsIDQ6J+Wbmyd9XHJcblx0XHRcdFx0IyBmbGVldExhYmVsU3RyaW5nID0gezA6JywgMTon5aOxJywgMjon5byQJywgMzon5Y+CJywgNDon6IKGJ31cclxuXHRcdFx0XHRiZWxvbmdlZEZsZWV0ID0gJ24vYSdcclxuXHRcdFx0XHRiZWxvbmdlZEZsZWV0TmFtZSA9IGZsZWV0TGFiZWxTdHJpbmdbMF1cclxuXHRcdFx0XHRfLmVhY2ggbXlGbGVldHMsIChmbGVldCktPlxyXG5cdFx0XHRcdFx0Xy5lYWNoIGZsZWV0LnNoaXAsIChmbGVldFNoaXBQa2V5LCBqKS0+XHJcblx0XHRcdFx0XHRcdGlmIHNoaXBQa2V5ID09IGZsZWV0U2hpcFBrZXlcclxuXHRcdFx0XHRcdFx0XHRiZWxvbmdlZEZsZWV0ID0gXCIje2ZsZWV0LmlkfS0je2p9XCJcclxuXHRcdFx0XHRcdFx0XHRiZWxvbmdlZEZsZWV0TmFtZSA9IGZsZWV0TGFiZWxTdHJpbmdbZmxlZXQuaWRdXHJcblxyXG5cclxuXHRcdFx0XHQjIOOCueODhuODvOOCv+OCueOBruWIhuino+OCkumWi+Wni+OAguOBvuOBmuOBr+iJpuiJh+OBrue0oOS9k+WApOOBi+OCie+8mlxyXG5cdFx0XHRcdGZvciBqIGluIFswLi4uQHN0YXR1c0FjY2Vzc29yLmxlbmd0aF1cclxuXHRcdFx0XHRcdGFjY2Vzc29yID0gQHN0YXR1c0FjY2Vzc29yW2pdXHJcblx0XHRcdFx0XHQjIOW8t+WMluOBjOWtmOWcqOOBmeOCi+OCueODhuODvOOCv+OCueOBi+OBqeOBhuOBi1xyXG5cdFx0XHRcdFx0cmVpbmZvcmNlbWVudCA9IGlmIGFjY2Vzc29yLmlzSW1wcm92YWJsZSB0aGVuIHNoaXAua3lvdWthW2FjY2Vzc29yLmluZGV4XSBlbHNlIDBcclxuXHRcdFx0XHRcdHNpbmdsZVN0YXR1cyA9XHJcblx0XHRcdFx0XHRcdOe0oOS9kzogc2hpcFthY2Nlc3Nvci52YXJOYW1lT25TaGlwXVswXVxyXG5cdFx0XHRcdFx0XHTmnIDlpKc6IHNoaXBbYWNjZXNzb3IudmFyTmFtZU9uU2hpcF1bMV1cclxuXHRcdFx0XHRcdFx06KOF5YKZ6KOc5q2jOiAwXHJcblx0XHRcdFx0XHRcdOW8t+WMluijnOatozogcmVpbmZvcmNlbWVudFxyXG5cdFx0XHRcdFx0XHTlvLfljJbmrovjgoo6IG51bGxcclxuXHRcdFx0XHRcdFx054++5Zyo5ZCI6KiIOiBzaGlwW2FjY2Vzc29yLnZhck5hbWVPblNoaXBdWzBdXHJcblxyXG5cdFx0XHRcdFx0IyDmoLzntI1cclxuXHRcdFx0XHRcdHN0YXR1c1thY2Nlc3Nvci5kc3BOYW1lXSA9IHNpbmdsZVN0YXR1c1xyXG5cclxuXHRcdFx0XHQjIOijheWCmW9iauOBi+OCieOCueODhuODvOOCv+OCueOCkuaMr+OCi+OAguOBpOOBhOOBp+OBq+ijheWCmeWQjeOCkuWPluOCiuOBoOOBl+OBpuOBiuOBj1xyXG5cdFx0XHRcdGFpck1hc3RlcnkgPSAwXHJcblx0XHRcdFx0bWF4QWlyTWFzdGVyeSA9IDBcclxuXHRcdFx0XHRzdGF0dXMu57Si5pW1LuijheWCmeeJueauiuijnOatoyA9IDBcclxuXHRcdFx0XHRlcXVpcE5hbWVzID0gXy5tYXAgb25zbG90cywgKGVxdWlwT2JqLCBuKT0+XHJcblx0XHRcdFx0XHQjIOWQhOOCueODhuODvOOCv+OCueOCkumghuOBq+WIhuino1xyXG5cdFx0XHRcdFx0Zm9yIG0gaW4gWzAuLi5Ac3RhdHVzQWNjZXNzb3IubGVuZ3RoXVxyXG5cdFx0XHRcdFx0XHRzaW5nbGVTdGF0dXMgPSBzdGF0dXNbQHN0YXR1c0FjY2Vzc29yW21dLmRzcE5hbWVdXHJcblx0XHRcdFx0XHRcdG1vZGlmeSA9IGVxdWlwT2JqW0BzdGF0dXNBY2Nlc3NvclttXS52YXJOYW1lT25FcXVpcF1cclxuXHRcdFx0XHRcdFx0c2luZ2xlU3RhdHVzLue0oOS9kyAtPSBtb2RpZnlcclxuXHRcdFx0XHRcdFx0c2luZ2xlU3RhdHVzLuijheWCmeijnOatoyArPSBtb2RpZnlcclxuXHRcdFx0XHRcdFx0IyDjgZPjgZPjga/kvZXluqbjgoLlm57jgaPjgabjgabnhKHpp4TjgILmnKzmnaXjga/lhajjgrnjg63jg4Pjg4jkuK3mnIDlvozjga7oo4XlgpnjgaDjgZHjgafjgoTjgozjgbDoia/jgYTjga/jgZpcclxuXHRcdFx0XHRcdFx0c2luZ2xlU3RhdHVzLuW8t+WMluaui+OCiiA9IHNpbmdsZVN0YXR1cy7mnIDlpKcgLSBzaW5nbGVTdGF0dXMu57Sg5L2TXHJcblxyXG5cdFx0XHRcdFx0IyDliLbnqbrlgKTjga7oqIjnrpdcclxuXHRcdFx0XHRcdGlmIGVxdWlwT2JqLnR5cGVbMl0gaW4gWzYsIDcsIDgsIDExXVxyXG5cdFx0XHRcdFx0XHRjdXJyZW50UGxhbmVzID0gTWF0aC5zcXJ0IHNoaXAub25zbG90W25dXHJcblx0XHRcdFx0XHRcdG1heGltdW1QbGFuZXMgPSBNYXRoLnNxcnQgYmFzZVNoaXAubWF4ZXFbbl1cclxuXHRcdFx0XHRcdFx0YW50aUFpciA9IGVxdWlwT2JqLnR5a3VcclxuXHRcdFx0XHRcdFx0YWlyTWFzdGVyeSArPSBwYXJzZUludCBjdXJyZW50UGxhbmVzICogYW50aUFpciwgMTBcclxuXHRcdFx0XHRcdFx0bWF4QWlyTWFzdGVyeSArPSBwYXJzZUludCBtYXhpbXVtUGxhbmVzICogYW50aUFpciwgMTBcclxuXHJcblx0XHRcdFx0XHQjIOe0ouaVteWApOOBruioiOeul1xyXG5cdFx0XHRcdFx0aWYgZXF1aXBPYmoudHlwZVsyXSBpbiBbNiwgNywgOCwgOSwgMTAsIDExXVxyXG5cdFx0XHRcdFx0XHRzdGF0dXMu57Si5pW1LuijheWCmeeJueauiuijnOatoyArPSBlcXVpcE9iai5zYWt1ICogMlxyXG5cdFx0XHRcdFx0aWYgZXF1aXBPYmoudHlwZVsyXSBpbiBbMTIsIDEzXVxyXG5cdFx0XHRcdFx0XHRzdGF0dXMu57Si5pW1LuijheWCmeeJueauiuijnOatoyArPSBlcXVpcE9iai5zYWt1XHJcblxyXG5cdFx0XHRcdFx0IyBlcXVpcE5hbWVz44Gr6KOF5YKZ5ZCN44KS5Ye65YqbXHJcblx0XHRcdFx0XHRyZXR1cm4gZXF1aXBPYmoubmFtZVxyXG5cclxuXHJcblx0XHRcdFx0IyDjg6zjg5njg6vjgajntYzpqJPlgKTjga7oqIjnrpdcclxuXHRcdFx0XHR0b3RhbFByZXYgPSBDSUMubWFzdGVycy5leHB0YWJsZVtzaGlwLmx2XS50b3RhbFxyXG5cdFx0XHRcdHRvdGFsTmV4dCA9IENJQy5tYXN0ZXJzLmV4cHRhYmxlW3NoaXAubHYrMV0udG90YWxcclxuXHRcdFx0XHRleHBPYmogPVxyXG5cdFx0XHRcdFx0J+epjeeulyc6IHNoaXAuZXhwWzBdXHJcblx0XHRcdFx0XHQn44Os44OZ44Or5a656YePJzogdG1wMSA9IHRvdGFsTmV4dCAtIHRvdGFsUHJldlxyXG5cdFx0XHRcdFx0J+ODrOODmeODq+mBlOaIkOmHjyc6IHRtcDIgPSBzaGlwLmV4cFswXSAtIHRvdGFsUHJldlxyXG5cdFx0XHRcdFx0J+ODrOODmeODq+aui+OCiic6IChpZiBzaGlwLmV4cFsxXSA9PSAwIHRoZW4gJycgZWxzZSBzaGlwLmV4cFsxXSlcclxuXHRcdFx0XHRcdCfpgZTmiJDnjocnOiB0bXAzID0gdG1wMiAvIHRtcDFcclxuXHRcdFx0XHRcdCfpgZTmiJDnjoclJzogXCIje3BhcnNlSW50KDEwMCAqIHRtcDMsIDEwKX0lXCJcclxuXHJcblx0XHRcdFx0b3V0bGV0ID1cclxuXHRcdFx0XHRcdF9lcXVpcE9iajogb25zbG90c1xyXG5cdFx0XHRcdFx0X3NoaXBUeXBlT2JqOiBzaGlwVHlwZVxyXG5cdFx0XHRcdFx0X2Jhc2VTaGlwT2JqOiBiYXNlU2hpcFxyXG5cdFx0XHRcdFx0X3NvcnQ6IHNoaXAuc29ydG5vXHJcblx0XHRcdFx0XHRfYmFzZUlkOiBiYXNlU2hpcC5pZFxyXG5cdFx0XHRcdFx0X2RvY2t0aW1lOiBzaGlwLm5kb2NrX3RpbWVcclxuXHRcdFx0XHRcdHBrZXk6IHNoaXBQa2V5XHJcblx0XHRcdFx0XHRObzogaVxyXG5cdFx0XHRcdFx06Imm56iuOiBzaGlwVHlwZS5uYW1lXHJcblx0XHRcdFx0XHToiablkI06IGJhc2VTaGlwLm5hbWVcclxuXHRcdFx0XHRcdOiJpuWQjeOCiOOBvzogYmFzZVNoaXAueW9taVxyXG5cdFx0XHRcdFx06Imm6ZqKOiBiZWxvbmdlZEZsZWV0TmFtZVxyXG5cdFx0XHRcdFx06Imm6ZqK55Wq5Y+3OiBiZWxvbmdlZEZsZWV0XHJcblx0XHRcdFx0XHRMdjogc2hpcC5sdlxyXG5cdFx0XHRcdFx057WM6aiT5YCkOiBleHBPYmpcclxuXHRcdFx0XHRcdOasoUx2OiBleHBPYmou44Os44OZ44Or5q6L44KKXHJcblx0XHRcdFx0XHTmrKFMduaVsOWApDogKGlmIGV4cE9iai7jg6zjg5njg6vmrovjgoogdGhlbiBleHBPYmou44Os44OZ44Or5q6L44KKIGVsc2UgJzk5OTk5OScpXHJcblx0XHRcdFx0XHTlo6vmsJc6IHNoaXAuY29uZCAtIDQ5XHJcblx0XHRcdFx0XHTjgrnjg5rjg4Pjgq86IHN0YXR1c1xyXG5cdFx0XHRcdFx054Gr5Yqb5q6L44KKOiBzdGF0dXMu54Gr5YqbLuW8t+WMluaui+OCilxyXG5cdFx0XHRcdFx06Zu36KOF5q6L44KKOiBzdGF0dXMu6Zu36KOFLuW8t+WMluaui+OCilxyXG5cdFx0XHRcdFx05a++56m65q6L44KKOiBzdGF0dXMu5a++56m6LuW8t+WMluaui+OCilxyXG5cdFx0XHRcdFx06ICQ5LmF5q6L44KKOiBzdGF0dXMu6ICQ5LmFLuW8t+WMluaui+OCilxyXG5cdFx0XHRcdFx06YGLOiBzdGF0dXMu6YGLLuePvuWcqOWQiOioiFxyXG5cdFx0XHRcdFx06KOF5YKZ5ZCNOiBlcXVpcE5hbWVzXHJcblx0XHRcdFx0XHTliLbnqbrlgKQ6IGFpck1hc3RlcnlcclxuXHRcdFx0XHRcdOacgOWkp+WItuepuuWApDogbWF4QWlyTWFzdGVyeVxyXG5cdFx0XHRcdFx057Si5pW15YCkOiBzdGF0dXMu57Si5pW1LuePvuWcqOWQiOioiFxyXG5cdFx0XHRcdFx05L+u5b6p5pmC6ZaTOiBAc2Vjb25kVG9Ib3VyIHNoaXAubmRvY2tfdGltZSwgJ25vcm1hbCdcclxuXHRcdFx0XHRcdOmNtTogaWYgc2hpcC5sb2NrZWQgdGhlbiAnwrYnIGVsc2UgJydcclxuXHJcblx0XHRcdFx0aWYgMFxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2cgXCLjg4fjg5Djg4PjgrDlh7rliptcIlxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2cgZXF1aXBOYW1lc1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2cgc3RhdHVzXHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyBvdXRsZXRcclxuXHJcblx0XHRcdFx0b3V0bGV0U2hpcHMucHVzaCBvdXRsZXRcclxuXHJcblx0XHRcdEBzZXR0bGVBbmFseXplZFJlc3VsdHMgb3V0bGV0U2hpcHNcclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMg6Kej5p6Q57WQ5p6c44KS44G+44Go44KB44Gm5L+d5a2YXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0c2V0dGxlQW5hbHl6ZWRSZXN1bHRzOiAob3V0bGV0U2hpcHMpLT5cclxuXHRcdFx0IyAxLTTjga7oiabpmorjgqrjg5bjgrjjgqfjgq/jg4jjgpLnlJ/miJBcclxuXHRcdFx0bXlGbGVldHMgPSBAcmVkdWNlS2V5UHJlZml4ZXMgQ0lDLnRyYW5zYWN0aW9ucy5teUZsZWV0c1xyXG5cdFx0XHRvdXRsZXRGbGVldHMgPSBbXVxyXG5cclxuXHRcdFx0Xy5lYWNoIG15RmxlZXRzLCAoZmxlZXQsIGtleSktPlxyXG5cdFx0XHRcdGZsZWV0U2hpcHMgPSBbXVxyXG5cdFx0XHRcdF8uZWFjaCBmbGVldC5zaGlwLCAoc2hpcElkKS0+XHJcblx0XHRcdFx0XHRzaGlwT2JqID0gXy5maW5kV2hlcmUgb3V0bGV0U2hpcHMsIHtwa2V5OiBzaGlwSWR9XHJcblx0XHRcdFx0XHRmbGVldFNoaXBzLnB1c2ggc2hpcE9ialxyXG5cclxuXHRcdFx0XHRvdXRsZXRGbGVldHNba2V5XSA9XHJcblx0XHRcdFx0XHRuYW1lOiBmbGVldC5uYW1lXHJcblx0XHRcdFx0XHRzaGlwczogZmxlZXRTaGlwc1xyXG5cclxuXHRcdFx0IyDph43opIfjgarjgZfoiabmlbBcclxuXHRcdFx0YWxsWW9taUxpc3QgPSBfLm1hcCBvdXRsZXRTaGlwcywgKHNoaXApPT5cclxuXHRcdFx0XHQjIOeJueauiuiJpueoruOBruWvvuW/nFxyXG5cdFx0XHRcdEBkaXN0aW5ndWlzaFNoaXB5b21pV2l0aFNoaXB0eXBlKHNoaXAsIHNoaXAu6Imm56iuLCAn6Imm5ZCN44KI44G/JylcclxuXHRcdFx0XHRyZXR1cm4gc2hpcC7oiablkI3jgojjgb9cclxuXHJcblx0XHRcdCMg44Kr44Km44Oz44OIXHJcblx0XHRcdGFsbFlvbWlMaXN0ID0gXy5ncm91cEJ5IGFsbFlvbWlMaXN0LCAoeW9taSktPlxyXG5cdFx0XHRcdHJldHVybiB5b21pXHJcblx0XHRcdGFsbFlvbWlMaXN0ID0gXy5rZXlzIGFsbFlvbWlMaXN0XHJcblxyXG5cdFx0XHQjIOS/neWtmFxyXG5cdFx0XHRjb25zb2xlLmxvZyBcIuaJgOacieWFqOiJpuOBruODgOODs+ODl1wiXHJcblx0XHRcdGNvbnNvbGUubG9nIG91dGxldFNoaXBzXHJcblx0XHRcdENJQy5zdGF0aXN0aWNzLmFsbERpc3RpbmN0T3duZWQgPSBhbGxZb21pTGlzdC5sZW5ndGhcclxuXHRcdFx0Q0lDLmFuYWx5emVPdXQgPSB0cnVlXHJcblx0XHRcdEBhbmFseXplZFBvcnQgPSBvdXRsZXRTaGlwc1xyXG5cdFx0XHRAYW5hbHl6ZWRGbGVldCA9IG91dGxldEZsZWV0c1xyXG5cclxuXHRcdFx0QGRldGVjdE5vbm93bmVkU2hpcHMoKVxyXG5cdFx0XHRAZ2VuZXJhdGVNb3RoZXJUYWJsZSB7fVxyXG5cdFx0XHRAcmVuZGVyRmxlZXRMaXN0KClcclxuXHRcdFx0QHJlbmRlckxldmVsQ2hhcnQoKVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDjg4fjg7zjgr/jgpLjg4bjg7zjg5bjg6vjgavmlbTlvaJcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRnZW5lcmF0ZU1vdGhlclRhYmxlOiAtPlxyXG5cdFx0XHQjIOOCveODvOODiOOCkuOBi+OBkeOBpuOBiuOBj1xyXG5cdFx0XHRzaGlwVGFibGUgPSBAYXBwbHlTb3J0QW5kRmlsdGVyIEBhbmFseXplZFBvcnRcclxuXHRcdFx0IyDjg5XjgqPjg6vjgr/lvozjga7oiabmlbDjgpLjgqLjg4Pjg5fjg4fjg7zjg4hcclxuXHRcdFx0QG51bWJlckRydW0gJCgnI2xldmVsLWZpbHRlci1jb3VudCcpLCBzaGlwVGFibGUubGVuZ3RoLCAxMDAwXHJcblxyXG5cdFx0XHRjb2x1bW5PcmRlciA9IFsnTm8nLCAncGtleScsICfoiabpmoonLCAn6Imm56iuJywgJ+iJpuWQjScsICdMdicsICfmrKFMdicsICfngavlipvmrovjgoonLCAn6Zu36KOF5q6L44KKJywgJ+Wvvuepuuaui+OCiicsICfogJDkuYXmrovjgoonLCAn6YGLJywgJ+Wjq+awlycsICfkv67lvqnmmYLplpMnLCAn6Y21J11cclxuXHRcdFx0dGJvZHkgPSAkKCc8dGJvZHkgLz4nKVxyXG5cdFx0XHR0aGVhZCA9ICQoJzx0aGVhZCAvPicpXHJcblx0XHRcdHRlbXBsYXRlSGVhZFRoID0gXy50ZW1wbGF0ZSAkKCcjdC1zaGlwdGFibGUtaGVhZC10aCcpLnRleHQoKS50cmltKClcclxuXHJcblx0XHRcdCMg44OY44OD44OA44Gu55Sf5oiQ77yaalF1ZXJ544KS44Gq44KL44G544GP6YG/44GR44OG44Kt44K544OI44OQ44OD44OV44Kh44Gn5Yem55CG44KS6YCy44KB44KL44CC5oSa55u044GralF1ZXJ544KS5L2/44GG44Go44KC44Gu44GZ44GU44GP6YGF44GEXHJcblx0XHRcdHN1cGVyQnVmZmVyID0gJydcclxuXHRcdFx0IyB0aFxyXG5cdFx0XHRidWZmZXIgPSAnJ1xyXG5cdFx0XHRfLmVhY2ggY29sdW1uT3JkZXIsIChrZXkpPT5cclxuXHRcdFx0XHRpZiBrZXkgPT0gJ+S/ruW+qeaZgumWkydcclxuXHRcdFx0XHRcdCMg5L+u5b6p5pmC6ZaT44Gv44OV44Ot44Oz44OI6KGo56S644GV44KM44KL5paH5a2X5YiX44Gn44Gv44Gq44GP5YaF6YOo44GuaW50IG1pY3JvdGltZeOCkuS9v+OBo+OBpuS4puOBueabv+OBiOOCi1xyXG5cdFx0XHRcdFx0c29ydE5hbWUgPSAnX2RvY2t0aW1lJ1xyXG5cdFx0XHRcdGVsc2UgaWYga2V5ID09ICfoiabpmoonXHJcblx0XHRcdFx0XHQjIOiJpumaiueVquWPt+OBr+a8ouaVsOWtl+OBp+OBr+OBquOBj+WGhemDqOOBrueul+eUqOaVsOWtl+OBp+S4puOBueabv+OBiOOCi1xyXG5cdFx0XHRcdFx0c29ydE5hbWUgPSAn6Imm6ZqK55Wq5Y+3J1xyXG5cdFx0XHRcdGVsc2UgaWYga2V5ID09ICfmrKFMdidcclxuXHRcdFx0XHRcdCMg5qyhTHbjga/jg6zjg5njg6s5OeOBruOBqOOBjeOBruepuuashOOBruaJseOBhOOCkuato+OBl+OBj+OBmeOCi1xyXG5cdFx0XHRcdFx0c29ydE5hbWUgPSAn5qyhTHbmlbDlgKQnXHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0c29ydE5hbWUgPSBrZXlcclxuXHJcblx0XHRcdFx0YnVmZmVyICs9IHRlbXBsYXRlSGVhZFRoXHJcblx0XHRcdFx0XHRoZWFkTGFiZWw6IGtleVxyXG5cdFx0XHRcdFx0c29ydE5hbWU6IHNvcnROYW1lXHJcblx0XHRcdFx0XHRzb3J0S2V5OiBAZGlzcGxheU9wdGlvbnMuc29ydFxyXG5cdFx0XHRcdFx0aXNJbnZlcnRlZDogQGRpc3BsYXlPcHRpb25zLmludmVydFxyXG5cdFx0XHQjIHRyXHJcblx0XHRcdHN1cGVyQnVmZmVyICs9IFwiPHRyPiN7YnVmZmVyfTwvdHI+XCJcclxuXHRcdFx0JChzdXBlckJ1ZmZlcikuYXBwZW5kVG8odGhlYWQpXHJcblxyXG5cdFx0XHQjIOOCs+ODs+ODhuODs+ODhOOBrueUn+aIkO+8muWQjOanmOOBrumrmOmAn+WMllxyXG5cdFx0XHRzdXBlckJ1ZmZlciA9ICcnXHJcblx0XHRcdF8uZWFjaCBzaGlwVGFibGUsIChzaGlwLCBpKS0+XHJcblx0XHRcdFx0IyB0ZFxyXG5cdFx0XHRcdGJ1ZmZlciA9ICcnXHJcblx0XHRcdFx0Xy5lYWNoIGNvbHVtbk9yZGVyLCAoa2V5KS0+XHJcblx0XHRcdFx0XHRidWZmZXIgKz0gXCI8dGQ+I3tzaGlwW2tleV19PC90ZD5cIlxyXG5cdFx0XHRcdCMgdHJcclxuXHRcdFx0XHRzdXBlckJ1ZmZlciArPSBcIjx0cj4je2J1ZmZlcn08L3RyPlwiXHJcblx0XHRcdCQoc3VwZXJCdWZmZXIpLmFwcGVuZFRvKHRib2R5KVxyXG5cclxuXHRcdFx0IyDmnIDntYLjg6zjg7Pjg4Djg6rjg7PjgrBcclxuXHRcdFx0QHJlbmRlclNoaXBUYWJsZSB0Ym9keSwgdGhlYWRcclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMg44OG44O844OW44Or6KGo56S644GoU3RpY2t544Gu5a6f6KOFXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0cmVuZGVyU2hpcFRhYmxlOiAodGJvZHksIHRoZWFkKS0+XHJcblx0XHRcdCMg44OG44O844OW44Orw5cy5L2c5oiQXHJcblx0XHRcdG91dGxldFRhYmxlID0gJCgnPHRhYmxlIC8+JylcclxuXHRcdFx0XHQuYWRkQ2xhc3MgJ291dHB1dC10YWJsZSBzdGF0aWMtYm9keSdcclxuXHRcdFx0XHQuYXR0ciB7aWQ6ICdzaGlwLXRhYmxlJ31cclxuXHRcdFx0b3V0bGV0VGFibGVTdGlja3kgPSAkKCc8dGFibGUgLz4nKVxyXG5cdFx0XHRcdC5hZGRDbGFzcyAnb3V0cHV0LXRhYmxlIHN0aWNreS1oZWFkZXInXHJcblx0XHRcdFx0LmF0dHIge2lkOiAnc2hpcC10YWJsZS1zdGlja3knfVxyXG5cclxuXHRcdFx0IyDjg6HjgqTjg7Pjg4bjg7zjg5bjg6vkvZzmiJBcclxuXHRcdFx0b3V0bGV0VGFibGUuYXBwZW5kKHRoZWFkLCB0Ym9keSlcclxuXHRcdFx0JCgnI21vdGhlci10YWJsZScpXHJcblx0XHRcdFx0LmNsb3Nlc3QgJy5vdXRwdXQnXHJcblx0XHRcdFx0LmFkZENsYXNzICdzaG93J1xyXG5cdFx0XHQkKCcjbW90aGVyLXRhYmxlJylcclxuXHRcdFx0XHQuaHRtbCBvdXRsZXRUYWJsZVxyXG5cdFx0XHRcdC5jc3NcclxuXHRcdFx0XHRcdGhlaWdodDogb3V0bGV0VGFibGUub3V0ZXJIZWlnaHQoKVxyXG5cdFx0XHRcdFx0IyB3aWR0aDogMTIwMFxyXG5cdFx0XHR0Ym9keS5hZGRDbGFzcygnc2hvdycpXHJcblxyXG5cdFx0XHQjIOOCueODhuOCo+ODg+OCreODvOODhuODvOODluODq+S9nOaIkFxyXG5cdFx0XHRvdXRsZXRUYWJsZVN0aWNreVxyXG5cdFx0XHRcdC5hcHBlbmQgdGhlYWQuY2xvbmUoKVxyXG5cdFx0XHRcdC5hcHBlbmRUbyAnI21vdGhlci10YWJsZSdcclxuXHRcdFx0QHNjcm9sbFdpbmRvdyAnZHVtbXknXHJcblx0XHRcdEBvdmVybGF5IGZhbHNlXHJcblxyXG5cdFx0XHQjIOOCouOCuOODo+OCueODiFxyXG5cdFx0XHRzZXRUaW1lb3V0ID0+XHJcblx0XHRcdFx0QGFkanVzdFN0aWNreVdpZHRoKClcclxuXHRcdFx0LCAxMDBcclxuXHJcblxyXG5cclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHQjIOOCueODhuOCo+ODg+OCreODvOODhuODvOODluODq+OBruW5heiqv+aVtFxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdGFkanVzdFN0aWNreVdpZHRoOiAtPlxyXG5cdFx0XHRvdXRsZXRUYWJsZSA9ICQoJy5vdXRwdXQtdGFibGUuc3RhdGljLWJvZHknKVxyXG5cdFx0XHRvdXRsZXRUYWJsZVN0aWNreSA9ICQoJy5vdXRwdXQtdGFibGUuc3RpY2t5LWhlYWRlcicpXHJcblxyXG5cdFx0XHQjIOODmOODg+ODgDHjgrvjg6vjgZTjgajjga7luYXmjIflrppcclxuXHRcdFx0c3RhdGljVGggPSBvdXRsZXRUYWJsZS5maW5kKCd0aGVhZCB0aCcpXHJcblx0XHRcdHN0aWNreVRoID0gb3V0bGV0VGFibGVTdGlja3kuZmluZCgndGhlYWQgdGgnKVxyXG5cclxuXHRcdFx0IyDjgb7jgZrluYXjgpLjgq/jg6rjgqJcclxuXHRcdFx0c3RhdGljVGguZWFjaCAoaSktPlxyXG5cdFx0XHRcdCR0aGlzID0gJChAKVxyXG5cdFx0XHRcdCR0aGlzLmNzcyB7d2lkdGg6ICdhdXRvJ31cclxuXHJcblx0XHRcdCMgYXV0b+W5heOCkuWbuuWumuWMluOBleOBm+OCi1xyXG5cdFx0XHRzdGF0aWNUaC5lYWNoIChpKS0+XHJcblx0XHRcdFx0JHRoaXMgPSAkKEApXHJcblx0XHRcdFx0JHRoaXMuY3NzIHt3aWR0aDogJHRoaXMud2lkdGgoKX1cclxuXHRcdFx0XHRzdGlja3lUaC5lcShpKS5jc3Mge3dpZHRoOiAkdGhpcy53aWR0aCgpfVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDjgr3jg7zjg4jjgq3jg7zjgpLjgq/jg6rjg4Pjgq/jgZfjgZ9cclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRjbGlja1NvcnQ6IChlKS0+XHJcblx0XHRcdGVsbSA9ICQgZS5jdXJyZW50VGFyZ2V0XHJcblx0XHRcdHNvcnRLZXkgPSBlbG0uZGF0YSAnc29ydCdcclxuXHJcblx0XHRcdCMg5ZCM44GY44Kt44O844KSMuWbnuOCr+ODquODg+OCr+OBl+OBn+OCiemAhumghuOBq+OBmeOCi1xyXG5cdFx0XHRpZiBzb3J0S2V5ID09IEBkaXNwbGF5T3B0aW9ucy5zb3J0XHJcblx0XHRcdFx0QGRpc3BsYXlPcHRpb25zLmludmVydCA9ICFAZGlzcGxheU9wdGlvbnMuaW52ZXJ0XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRAZGlzcGxheU9wdGlvbnMuaW52ZXJ0ID0gZmFsc2VcclxuXHJcblx0XHRcdCMg44K944O844OI44Kt44O844KS6Kit5a6aXHJcblx0XHRcdEBkaXNwbGF5T3B0aW9ucy5zb3J0ID0gZWxtLmRhdGEgJ3NvcnQnXHJcblxyXG5cdFx0XHQjIOWGjeODrOODs+ODgOODquODs+OCsFxyXG5cdFx0XHRAZ2VuZXJhdGVNb3RoZXJUYWJsZSgpXHJcblxyXG5cclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHQjIOODrOODmeODq+ODleOCo+ODq+OCv+OCkuOCr+ODquODg+OCr+OBl+OBn1xyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdGNsaWNrTGV2ZWxGaWx0ZXI6IChlKS0+XHJcblx0XHRcdGVsbSA9ICQgZS5jdXJyZW50VGFyZ2V0XHJcblxyXG5cdFx0XHQjIOOCueOCpOODg+ODgeOCueOCv+OCpOODq+OBruaTjeS9nFxyXG5cdFx0XHQkKCcubGV2ZWwtZmlsdGVyJykuYWRkQ2xhc3MoJ2VuYWJsZWQnKVxyXG5cdFx0XHRlbG0ucHJldkFsbCgnLmxldmVsLWZpbHRlcicpLnJlbW92ZUNsYXNzKCdlbmFibGVkJylcclxuXHJcblx0XHRcdCMg6Za+5YCk44Gu44K744OD44OIXHJcblx0XHRcdEBkaXNwbGF5T3B0aW9ucy5sZXZlbFRocmVzaG9sZCA9IGVsbS5kYXRhKCd0aHJlc2hvbGQnKVxyXG5cclxuXHRcdFx0IyDlho3jg6zjg7Pjg4Djg6rjg7PjgrBcclxuXHRcdFx0QGdlbmVyYXRlTW90aGVyVGFibGUoKVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDoiabjga7jg5XjgqPjg6vjgr/jg6rjg7PjgrDjgajjgr3jg7zjg4hcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRhcHBseVNvcnRBbmRGaWx0ZXI6IChzaGlwVGFibGUpLT5cclxuXHRcdFx0X3NoaXBUYWJsZSA9IF8uY2xvbmUgc2hpcFRhYmxlXHJcblx0XHRcdG9wdGlvbnMgPSBAZGlzcGxheU9wdGlvbnNcclxuXHJcblx0XHRcdCMg44K944O844OI5a6f6KGM77ya5pyA5Yid44Gr44OH44OV44Kp44Or44OI44K944O844OI44Gu6YGp55SoXHJcblx0XHRcdGlmIG9wdGlvbnMuc29ydCAhPSAnTm8nXHJcblx0XHRcdFx0X3NoaXBUYWJsZSA9IF8uc29ydEJ5IF9zaGlwVGFibGUsIChzaGlwKS0+XHJcblx0XHRcdFx0XHRzaGlwLk5vXHJcblxyXG5cdFx0XHQjIOOCveODvOODiOWun+ihjO+8muasoeOBq+ODl+ODqeOCpOODnuODquOCveODvOODiOOBrumBqeeUqFxyXG5cdFx0XHRfc2hpcFRhYmxlID0gXy5zb3J0QnkgX3NoaXBUYWJsZSwgKHNoaXApLT5cclxuXHRcdFx0XHRzaGlwW29wdGlvbnMuc29ydF1cclxuXHJcblx0XHRcdCMg6YCG6aCG44K944O844OI44Gu5a++5b+cXHJcblx0XHRcdGlmIG9wdGlvbnMuaW52ZXJ0XHJcblx0XHRcdFx0X3NoaXBUYWJsZSA9IF9zaGlwVGFibGUucmV2ZXJzZSgpXHJcblxyXG5cdFx0XHQjIOODrOODmeODq+ODleOCo+ODq+OCv+OBrumBqeeUqFxyXG5cdFx0XHRfc2hpcFRhYmxlID0gXy5yZWplY3QgX3NoaXBUYWJsZSwgKHNoaXApLT5cclxuXHRcdFx0XHRzaGlwLkx2IDwgb3B0aW9ucy5sZXZlbFRocmVzaG9sZFxyXG5cclxuXHRcdFx0X3NoaXBUYWJsZVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDoiabpmorooajnpLpcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRyZW5kZXJGbGVldExpc3Q6IC0+XHJcblx0XHRcdHNlY3Rpb24gPSAkKCcuZmxlZXQtZXF1aXBkZXRhaWxzJykuZW1wdHkoKVxyXG5cdFx0XHRkbCA9ICQoJzxkbCAvPicpLmF0dHIoe2lkOiAnZmxlZXQtbGlzdCd9KVxyXG5cclxuXHRcdFx0dGVtcGxhdGVEZWNrc3VtbWFyeVRleHRFYWNoc2hpcCA9IF8udGVtcGxhdGUgJCgnI3QtZGVja3N1bW1hcnktdGV4dC1lYWNoc2hpcCcpLnRleHQoKS50cmltKClcclxuXHRcdFx0dGVtcGxhdGVEZWNrc3VtbWFyeUVhY2hzaGlwID0gXy50ZW1wbGF0ZSAkKCcjdC1kZWNrc3VtbWFyeS1lYWNoc2hpcCcpLnRleHQoKS50cmltKClcclxuXHRcdFx0dGVtcGxhdGVEZWNrc3VtbWFyeUhlYWQgPSBfLnRlbXBsYXRlICQoJyN0LWRlY2tzdW1tYXJ5LWhlYWQnKS50ZXh0KCkudHJpbSgpXHJcblx0XHRcdHRlbXBsYXRlRGVja3N1bW1hcnlUZXh0Q29udGVudCA9IF8udGVtcGxhdGUgJCgnI3QtZGVja3N1bW1hcnktdGV4dC1jb250ZW50JykudGV4dCgpLnRyaW0oKVxyXG5cdFx0XHR0ZW1wbGF0ZURlY2tzdW1tYXJ5Q29udGVudCA9IF8udGVtcGxhdGUgJCgnI3QtZGVja3N1bW1hcnktY29udGVudCcpLnRleHQoKS50cmltKClcclxuXHRcdFx0dGVtcGxhdGVEZWNrc3VtbWFyeUxpc3QgPSBfLnRlbXBsYXRlICQoJyN0LWRlY2tzdW1tYXJ5LWxpc3QnKS50ZXh0KCkudHJpbSgpXHJcblx0XHRcdHRlbXBsYXRlRGVja2RldGFpbFRleHRFYWNoc2hpcCA9IF8udGVtcGxhdGUgJCgnI3QtZGVja2RldGFpbC10ZXh0LWVhY2hzaGlwJykudGV4dCgpLnRyaW0oKVxyXG5cdFx0XHR0ZW1wbGF0ZURlY2tkZXRhaWxFYWNoc2hpcCA9IF8udGVtcGxhdGUgJCgnI3QtZGVja2RldGFpbC1lYWNoc2hpcCcpLnRleHQoKS50cmltKClcclxuXHRcdFx0dGVtcGxhdGVEZWNrZGV0YWlsTGlzdCA9IF8udGVtcGxhdGUgJCgnI3QtZGVja2RldGFpbC1saXN0JykudGV4dCgpLnRyaW0oKVxyXG5cclxuXHJcblx0XHRcdF8uZWFjaCBAYW5hbHl6ZWRGbGVldCwgKGZsZWV0LCBmTnVtYmVyKT0+XHJcblx0XHRcdFx0ZmxlZXROdW1iZXIgPSBmTnVtYmVyICsgMVxyXG5cdFx0XHRcdHRleHRCdWZmZXIgPSBbXTtcclxuXHRcdFx0XHR0ZXh0QnVmZmVyMiA9IFtdO1xyXG5cclxuXHRcdFx0XHRkbC5hcHBlbmQoXHJcblx0XHRcdFx0XHQkIHRlbXBsYXRlRGVja3N1bW1hcnlIZWFkXHJcblx0XHRcdFx0XHRcdGZsZWV0TnVtYmVyOiBmbGVldE51bWJlclxyXG5cdFx0XHRcdFx0XHRmbGVldE5hbWU6IGZsZWV0Lm5hbWVcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0dWwgPSAkIHRlbXBsYXRlRGVja3N1bW1hcnlMaXN0XHJcblx0XHRcdFx0XHRmbGVldE51bWJlcjogZmxlZXROdW1iZXJcclxuXHRcdFx0XHR1bDIgPSAkIHRlbXBsYXRlRGVja2RldGFpbExpc3RcclxuXHRcdFx0XHRcdGZsZWV0TnVtYmVyOiBmbGVldE51bWJlclxyXG5cclxuXHJcblx0XHRcdFx0IyDliLbnqbrjgajntKLmlbVcclxuXHRcdFx0XHR0b3RhbEFpck1hc3RlcnkgPSAwXHJcblx0XHRcdFx0c2NvdXQgPVxyXG5cdFx0XHRcdFx06Imm6ZqK57eP6KiIOiAwXHJcblx0XHRcdFx0XHTntKDkvZPlkIjoqIg6IDBcclxuXHRcdFx0XHRcdOijheWCmeWQiOioiDogMFxyXG5cdFx0XHRcdFx054m55q6K6KiI566X57eP6KiIOiAwXHJcblxyXG5cdFx0XHRcdCMg6Imm6ZqK44Gu5qeL5oiQ6Imm44KS5LiA6Zq744Ga44Gk5Zue44GZXHJcblx0XHRcdFx0Xy5lYWNoIGZsZWV0LnNoaXBzLCAoc2hpcCwgc2hpcE51bWJlciktPlxyXG5cdFx0XHRcdFx0aWYgc2hpcCA9PSB1bmRlZmluZWRcclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWVcclxuXHJcblx0XHRcdFx0XHQjIOiJpumaiuODhuOCreOCueODiOWHuuWKm1xyXG5cdFx0XHRcdFx0ZXF1aXBOYW1lcyA9IFtdXHJcblx0XHRcdFx0XHRfLmVhY2ggc2hpcC5fZXF1aXBPYmosIChlcXVpcCktPlxyXG5cdFx0XHRcdFx0XHRpZihlcXVpcC5pZCAhPSAtMSlcclxuXHRcdFx0XHRcdFx0XHRlcXVpcE5hbWVzLnB1c2ggZXF1aXAubmFtZVxyXG5cdFx0XHRcdFx0aWYgZXF1aXBOYW1lcy5sZW5ndGggPT0gMCB0aGVuIGVxdWlwTmFtZXMgPSBbJ+KIhSddXHJcblxyXG5cdFx0XHRcdFx0IyDliLbnqbrlgKTjgajntKLmlbXlgKRcclxuXHRcdFx0XHRcdHRvdGFsQWlyTWFzdGVyeSArPSBzaGlwLuWItuepuuWApFxyXG5cdFx0XHRcdFx0c2NvdXQu6Imm6ZqK57eP6KiIICs9IHNoaXAu57Si5pW15YCkXHJcblx0XHRcdFx0XHRzY291dC7ntKDkvZPlkIjoqIggKz0gc2hpcC7jgrnjg5rjg4Pjgq8u57Si5pW1Lue0oOS9k1xyXG5cdFx0XHRcdFx0c2NvdXQu6KOF5YKZ5ZCI6KiIICs9IHNoaXAu44K544Oa44OD44KvLue0ouaVtS7oo4Xlgpnnibnmroroo5zmraNcclxuXHJcblx0XHRcdFx0XHQjIOODquOCueODiOS9nOaIkFxyXG5cdFx0XHRcdFx0dWwuYXBwZW5kKFxyXG5cdFx0XHRcdFx0XHQkIHRlbXBsYXRlRGVja3N1bW1hcnlFYWNoc2hpcFxyXG5cdFx0XHRcdFx0XHRcdGlzRmxhZ3NoaXA6IHNoaXBOdW1iZXIgPT0gMFxyXG5cdFx0XHRcdFx0XHRcdHR5cGU6IHNoaXAu6Imm56iuXHJcblx0XHRcdFx0XHRcdFx0bmFtZTogc2hpcC7oiablkI1cclxuXHRcdFx0XHRcdFx0XHRsZXZlbDogc2hpcC5MdlxyXG5cdFx0XHRcdFx0XHRcdGNvbmRpdGlvbjogc2hpcC7lo6vmsJdcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdHVsMi5hcHBlbmQoXHJcblx0XHRcdFx0XHRcdCQgdGVtcGxhdGVEZWNrZGV0YWlsRWFjaHNoaXBcclxuXHRcdFx0XHRcdFx0XHRpc0ZsYWdzaGlwOiBzaGlwTnVtYmVyID09IDBcclxuXHRcdFx0XHRcdFx0XHRuYW1lOiBzaGlwLuiJpuWQjVxyXG5cdFx0XHRcdFx0XHRcdGxldmVsOiBzaGlwLkx2XHJcblx0XHRcdFx0XHRcdFx0ZXF1aXBtZW50czogZXF1aXBOYW1lcy5qb2luKCfjgIEnKVxyXG5cdFx0XHRcdFx0KVxyXG5cclxuXHRcdFx0XHRcdHRleHRCdWZmZXIucHVzaChcclxuXHRcdFx0XHRcdCB0ZW1wbGF0ZURlY2tzdW1tYXJ5VGV4dEVhY2hzaGlwXHJcblx0XHRcdFx0XHRcdFx0aXNGbGFnc2hpcDogc2hpcE51bWJlciA9PSAwXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogc2hpcC7oiabnqK5cclxuXHRcdFx0XHRcdFx0XHRuYW1lOiBzaGlwLuiJpuWQjVxyXG5cdFx0XHRcdFx0XHRcdGxldmVsOiBzaGlwLkx2XHJcblx0XHRcdFx0XHRcdFx0Y29uZGl0aW9uOiBzaGlwLuWjq+awl1xyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0dGV4dEJ1ZmZlcjIucHVzaChcclxuXHRcdFx0XHRcdCB0ZW1wbGF0ZURlY2tkZXRhaWxUZXh0RWFjaHNoaXBcclxuXHRcdFx0XHRcdFx0XHRpc0ZsYWdzaGlwOiBzaGlwTnVtYmVyID09IDBcclxuXHRcdFx0XHRcdFx0XHRuYW1lOiBzaGlwLuiJpuWQjVxyXG5cdFx0XHRcdFx0XHRcdGxldmVsOiBzaGlwLkx2XHJcblx0XHRcdFx0XHRcdFx0ZXF1aXBtZW50czogZXF1aXBOYW1lcy5qb2luKCfjgIEnKVxyXG5cdFx0XHRcdFx0KVxyXG5cclxuXHRcdFx0XHQjIOiJpumaiuiHquS9k+OBjOWtmOWcqOOBl+OBquOBi+OBo+OBn+WgtOWQiFxyXG5cdFx0XHRcdGZsZWV0U2hpcHNDb3VudCA9IF8uY29tcGFjdChmbGVldC5zaGlwcykubGVuZ3RoXHJcblx0XHRcdFx0aWYgZmxlZXRTaGlwc0NvdW50ID09IDBcclxuXHRcdFx0XHRcdGxpID0gJCgnPGxpIC8+JykuYXBwZW5kKFwiPHNwYW4gY2xhc3M9I3tcInNoaXAtdHlwZVwifT7jgarjgZc8L3NwYW4+XCIpXHJcblx0XHRcdFx0XHRsaS5hcHBlbmRUbyh1bClcclxuXHRcdFx0XHRcdGxpLmFwcGVuZFRvKHVsMilcclxuXHJcblx0XHRcdFx0IyDpm7vmjqIgKyDntKLmlbXmqZ/DlzIgKyDiiJoo57Sg5L2T57Si5pW15YCk44Gu6Imm6ZqK5ZCI6KiIKVxyXG5cdFx0XHRcdHNjb3V0LueJueauiuioiOeul+e3j+ioiCA9IE1hdGguZmxvb3IgTWF0aC5zcXJ0KHNjb3V0Lue0oOS9k+WQiOioiCkgKyBzY291dC7oo4XlgpnlkIjoqIhcclxuXHJcblx0XHRcdFx0ZGQgPSAkIHRlbXBsYXRlRGVja3N1bW1hcnlDb250ZW50XHJcblx0XHRcdFx0XHRmbGVldE51bWJlcjogZmxlZXROdW1iZXJcclxuXHRcdFx0XHRcdHRvdGFsQWlyTWFzdGVyeTogdG90YWxBaXJNYXN0ZXJ5XHJcblx0XHRcdFx0XHR0b3RhbFNjb3V0OiBzY291dC7oiabpmornt4/oqIhcclxuXHRcdFx0XHRcdHRvdGFsV2VpcmRTY291dDogc2NvdXQu54m55q6K6KiI566X57eP6KiIXHJcblxyXG5cdFx0XHRcdHRleHRIZWFkID0gdGVtcGxhdGVEZWNrc3VtbWFyeVRleHRDb250ZW50XHJcblx0XHRcdFx0XHRmbGVldE51bWJlcjogZmxlZXROdW1iZXJcclxuXHRcdFx0XHRcdHRvdGFsQWlyTWFzdGVyeTogdG90YWxBaXJNYXN0ZXJ5XHJcblx0XHRcdFx0XHR0b3RhbFNjb3V0OiBzY291dC7oiabpmornt4/oqIhcclxuXHRcdFx0XHRcdHRvdGFsV2VpcmRTY291dDogc2NvdXQu54m55q6K6KiI566X57eP6KiIXHJcblxyXG5cdFx0XHRcdCMg44Oq44K544OI5Ye65YqbXHJcblx0XHRcdFx0dWwuYXBwZW5kVG8oZGQpXHJcblx0XHRcdFx0dWwyLmFwcGVuZFRvKGRkKVxyXG5cdFx0XHRcdGRkLmFwcGVuZFRvKGRsKVxyXG5cdFx0XHRcdHRleHRCdWZmZXIudW5zaGlmdCB0ZXh0SGVhZFxyXG5cdFx0XHRcdHRleHRCdWZmZXIyLnVuc2hpZnQgdGV4dEhlYWRcclxuXHRcdFx0XHRAYW5hbHl6ZWRGbGVldFRleHQuc3VtbWFyeVtmbGVldE51bWJlcl0gPSB0ZXh0QnVmZmVyLmpvaW4gJ1xcbidcclxuXHRcdFx0XHRAYW5hbHl6ZWRGbGVldFRleHQuZGV0YWlsZWRbZmxlZXROdW1iZXJdID0gdGV4dEJ1ZmZlcjIuam9pbiAnXFxuJ1xyXG5cclxuXHRcdFx0XHRkZC5jc3Mge2hlaWdodDogZmxlZXRTaGlwc0NvdW50ICogMjUgKyAzMH1cclxuXHJcblxyXG5cdFx0XHQjIENTU+OBqOOBguOCj+OBm+OBpuOCouODi+ODoeODvOOCt+ODp+ODs+OCkuWun+ePvlxyXG5cdFx0XHQkKCcjZmxlZXQtc3VtbWFyeScpLmNsb3Nlc3QoJy5vdXRwdXQnKS5hZGRDbGFzcygnc2hvdycpXHJcblx0XHRcdCQoJyNmbGVldC1zdW1tYXJ5JykuaHRtbChkbCkuY3NzIHtoZWlnaHQ6IGRsLm91dGVySGVpZ2h0KCl9XHJcblx0XHRcdGRsLmFkZENsYXNzKCdzaG93JylcclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMg6Imm6ZqK44OY44OD44OA44KS44Kv44Oq44OD44Kv44GX44GfXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0Y2xpY2tGbGVldEhlYWQ6IChlKS0+XHJcblx0XHRcdGVsbSA9ICQgZS5jdXJyZW50VGFyZ2V0XHJcblx0XHRcdGZsZWV0TnVtYmVyID0gZWxtLmRhdGEoJ2ZsZWV0JylcclxuXHJcblx0XHRcdCQgXCJkdC5mbGVldC0je2ZsZWV0TnVtYmVyfSwgZGQuZmxlZXQtI3tmbGVldE51bWJlcn1cIlxyXG5cdFx0XHRcdC50b2dnbGVDbGFzcyAndHdlYWtlbidcclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDoiabpmormp4vmiJDjgpLjgq/jg6rjg4Pjgq/jgZfjgZ9cclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRjbGlja0ZsZWV0RGlzY3JpcHRpb246IChlKS0+XHJcblx0XHRcdGVsbSA9ICQoZS5jdXJyZW50VGFyZ2V0KS5jbG9zZXN0KCcuZmxlZXQtaW5mbycpXHJcblx0XHRcdGZsZWV0TnVtYmVyID0gZWxtLmRhdGEoJ2ZsZWV0JylcclxuXHJcblx0XHRcdGlmIGVsbS5oYXNDbGFzcyAndHdlYWtlbidcclxuXHRcdFx0XHRvdXRwdXQgPSBAYW5hbHl6ZWRGbGVldFRleHQuZGV0YWlsZWRbZmxlZXROdW1iZXJdXHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHRvdXRwdXQgPSBAYW5hbHl6ZWRGbGVldFRleHQuc3VtbWFyeVtmbGVldE51bWJlcl1cclxuXHJcblx0XHRcdCMg44OG44Kt44K544OI44Ko44Oq44Ki55Sf5oiQXHJcblx0XHRcdGNvcHlBcmVhID0gJCgnPHRleHRhcmVhIC8+JykudGV4dChvdXRwdXQpLmFkZENsYXNzKCdjb3B5JykuYXR0cih7cm93czogN30pXHJcblx0XHRcdGNvcHlEaXYgPSAkKCc8ZGl2IC8+JykuYWRkQ2xhc3MoJ2NvcHktd3JhcHBlcicpLmFwcGVuZChjb3B5QXJlYSlcclxuXHRcdFx0ZWxtLmFwcGVuZChjb3B5RGl2KVxyXG5cclxuXHRcdFx0IyDjgrPjg5Tjg7xBUEnjga7jgrXjg53jg7zjg4jnirbms4Hnorroqo1cclxuXHRcdFx0IyBodHRwOi8vcWlpdGEuY29tL3lvaWNoaXJvQGdpdGh1Yi9pdGVtcy80M2VlNzUxOTZiZjY0M2NkZTA5M1xyXG5cdFx0XHRpc1N1cHBvcnRlZCA9IGRvY3VtZW50LnF1ZXJ5Q29tbWFuZFN1cHBvcnRlZCgnY3V0JylcclxuXHRcdFx0aWYgIWlzU3VwcG9ydGVkXHJcblx0XHRcdFx0cmV0dXJuXHJcblxyXG5cdFx0XHQjIOOCqOODquOCoumBuOaKnuODu+OCs+ODlOODvOWun+ihjFxyXG5cdFx0XHRjb3B5QXJlYS5nZXQoMCkuc2VsZWN0KClcclxuXHRcdFx0dHJ5XHJcblx0XHRcdFx0aXNTdWNjZXNzZnVsID0gZG9jdW1lbnQuZXhlY0NvbW1hbmQgJ2N1dCdcclxuXHRcdFx0XHRpZiBpc1N1Y2Nlc3NmdWxcclxuXHRcdFx0XHRcdEBub3RpZnkgJ0NvcGllZCEnXHJcblx0XHRcdGNhdGNoIGVyclxyXG5cdFx0XHRcdGNvbnNvbGUubG9nICdVbmFibGUgdG8gY29weS4nXHJcblxyXG5cdFx0XHQjIOeUqOa4iOOBv+OBruOCs+ODlOODvOWvvuixoeOCkua2iOWOu1xyXG5cdFx0XHRjb3B5RGl2LnJlbW92ZSgpXHJcblxyXG5cclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMg54m55q6K6Imm56iu44Gu5YiG6KejXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0ZGlzdGluZ3Vpc2hTaGlweW9taVdpdGhTaGlwdHlwZTogKHNoaXAsIHNoaXBUeXBlLCB5b21pS2V5KS0+XHJcblx0XHRcdGlmIHNoaXBbeW9taUtleV0gaW4gW1wi44Gh44Go44GbXCIsIFwi44Gh44KI44GgXCJdXHJcblx0XHRcdFx0c2hpcFt5b21pS2V5XSA9IFwiI3tzaGlwW3lvbWlLZXldfeODuyN7c2hpcFR5cGV9XCJcclxuXHRcdFx0ZWxzZSBpZiBzaGlwW3lvbWlLZXldID09IFwi44Gf44GE44GS44GE44O744KK44KF44GG44G744GGXCJcclxuXHRcdFx0XHRpZiBzaGlwVHlwZSA9PSBcIua9nOawtOavjeiJplwiXHJcblx0XHRcdFx0XHRzaGlwW3lvbWlLZXldID0gXCLjgZ/jgYTjgZLjgYTjg7sje3NoaXBUeXBlfVwiXHJcblx0XHRcdFx0ZWxzZSBpZiBzaGlwVHlwZSA9PSBcIui7veepuuavjVwiXHJcblx0XHRcdFx0XHRzaGlwW3lvbWlLZXldID0gXCLjgorjgoXjgYbjgbvjgYbjg7sje3NoaXBUeXBlfVwiXHJcblxyXG5cdFx0XHRyZXR1cm4gc2hpcFxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDmnKrmiYDmjIHoiabjga7mpJzlh7pcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRkZXRlY3ROb25vd25lZFNoaXBzOiAobXlTaGlwcywgYmFzZVNoaXBzKS0+XHJcblx0XHRcdG15U2hpcHMgPSBAcmVkdWNlS2V5UHJlZml4ZXMgQ0lDLnRyYW5zYWN0aW9ucy5teVNoaXBzXHJcblx0XHRcdGJhc2VTaGlwcyA9IENJQy5tYXN0ZXJzLnNoaXBzXHJcblx0XHRcdHNoaXBUeXBlcyA9IENJQy5tYXN0ZXJzLnNoaXBUeXBlc1xyXG5cclxuXHRcdFx0IyDnibnmroroiabnqK7jga7lgIvliKXlr77lv5xcclxuXHRcdFx0YmFzZVNoaXBzID0gXy5lYWNoIGJhc2VTaGlwcywgKGJhc2UpPT5cclxuXHRcdFx0XHRAZGlzdGluZ3Vpc2hTaGlweW9taVdpdGhTaGlwdHlwZShiYXNlLCBzaGlwVHlwZXNbYmFzZS5zdHlwZV0ubmFtZSwgJ3lvbWknKVxyXG5cclxuXHRcdFx0IyDmt7HmtbfoiabjgpLpmaTjgY9cclxuXHRcdFx0YmFzZVNoaXBzID0gXy5yZWplY3QgYmFzZVNoaXBzLCAoYmFzZSktPlxyXG5cdFx0XHRcdGlmIGJhc2Uuc29ydG5vID09IDBcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlXHJcblxyXG5cdFx0XHQjIOWFqOiJpuOBruOCq+OCpuODs+ODiFxyXG5cdFx0XHRhbGxJbXBsZW1lbnRlZCA9IF8uZ3JvdXBCeSBiYXNlU2hpcHMsIChiYXNlKS0+XHJcblx0XHRcdFx0YmFzZS55b21pXHJcblx0XHRcdGFsbEltcGxlbWVudGVkID0gXy5rZXlzIGFsbEltcGxlbWVudGVkXHJcblx0XHRcdENJQy5zdGF0aXN0aWNzLmFsbEltcGxlbWVudGVkID0gYWxsSW1wbGVtZW50ZWRcclxuXHRcdFx0Y29uc29sZS5sb2cgXCLlrp/oo4XmuIjjgb/lhajoiabjga7kuIDopqdcIlxyXG5cdFx0XHRjb25zb2xlLmxvZyBhbGxJbXBsZW1lbnRlZFxyXG5cclxuXHRcdFx0IyDoiabjga7mtojjgZfovrzjgb9cclxuXHRcdFx0b3duZWRTaGlwWW9taSA9IFtdXHJcblx0XHRcdF8uZWFjaCBteVNoaXBzLCAoc2hpcCktPlxyXG5cdFx0XHRcdGJhc2VTaGlwcyA9IF8ucmVqZWN0IGJhc2VTaGlwcywgKGJhc2UpLT5cclxuXHRcdFx0XHRcdCMg5oyB44Gj44Gm44GE44KL6Imm44KS6Zmk44GPXHJcblx0XHRcdFx0XHRpZiBiYXNlLmlkID09IHNoaXAuc2hpcF9pZFxyXG5cdFx0XHRcdFx0XHRvd25lZFNoaXBZb21pLnB1c2ggYmFzZS55b21pXHJcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlXHJcblxyXG5cdFx0XHQjIOaJgOaMgeiJpuOBqOiqreOBv+OCkuWQjOOBmOOBj+OBmeOCi+iJpuOCgua2iOOBmVxyXG5cdFx0XHRfLmVhY2ggb3duZWRTaGlwWW9taSwgKHlvbWkpLT5cclxuXHRcdFx0XHRiYXNlU2hpcHMgPSBfLnJlamVjdCBiYXNlU2hpcHMsIChiYXNlKS0+XHJcblx0XHRcdFx0XHQoYmFzZS55b21pID09IHlvbWkpXHJcblxyXG5cdFx0XHQjIOacquaJgOaMgeiJpuOCkuiqreOBv+OBp+OCsOODq+ODvOODl+WMllxyXG5cdFx0XHRiYXNlU2hpcHMgPSBfLmdyb3VwQnkgYmFzZVNoaXBzLCAoYmFzZSktPlxyXG5cdFx0XHRcdGJhc2UueW9taVxyXG5cclxuXHRcdFx0IyDoqq3jgb/jgpLmraPlvI/lkI3jgavou6Lmj5tcclxuXHRcdFx0b3V0bGV0U2hpcHMgPSBbXVxyXG5cdFx0XHRfLmVhY2ggYmFzZVNoaXBzLCAoc2hpcHMsIHlvbWkpLT5cclxuXHRcdFx0XHQjIOODrOODmeODq+mghuOBq+OCveODvOODiOOBl+OBpuOBiuOBj1xyXG5cdFx0XHRcdHNoaXBzID0gXy5zb3J0Qnkgc2hpcHMsIChzaGlwKS0+XHJcblx0XHRcdFx0XHRpZiBzaGlwLmFmdGVybHYgPT0gMFxyXG5cdFx0XHRcdFx0XHRzaGlwLmFmdGVybHYgPSA5OTlcclxuXHRcdFx0XHRcdHJldHVybiBzaGlwLmFmdGVybHZcclxuXHJcblx0XHRcdFx0Z3JvdXBOYW1lID0gW11cclxuXHRcdFx0XHRfLmVhY2ggc2hpcHMsIChzaGlwKS0+XHJcblx0XHRcdFx0XHRncm91cE5hbWUucHVzaCBzaGlwLm5hbWVcclxuXHRcdFx0XHRub25Pd25lZCA9XHJcblx0XHRcdFx0XHRuYW1lOiBncm91cE5hbWUuam9pbignLycpXHJcblx0XHRcdFx0XHR5b21pOiB5b21pXHJcblx0XHRcdFx0XHRzaGlwczogc2hpcHNcclxuXHRcdFx0XHRvdXRsZXRTaGlwcy5wdXNoIG5vbk93bmVkXHJcblxyXG5cdFx0XHQjIOODrOODs+ODgOODquODs+OCsFxyXG5cdFx0XHRAcmVuZGVyTm9ub3duZWRTaGlwcyBvdXRsZXRTaGlwc1xyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDmnKrmiYDmjIHoiabjga7ooajnpLpcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRyZW5kZXJOb25vd25lZFNoaXBzOiAobm9uT3duZWQpLT5cclxuXHRcdFx0ZGwgPSAkKCc8ZGwgLz4nKS5hdHRyKHtpZDogJ25vbm93bmVkLWxpc3QnfSlcclxuXHJcblx0XHRcdF8uZWFjaCBub25Pd25lZCwgKHNoaXBHcm91cCwga2V5KS0+XHJcblx0XHRcdFx0ZHQgPSAkKCc8ZHQgLz4nKS50ZXh0KFwiI3tzaGlwR3JvdXAubmFtZX3vvIgje3NoaXBHcm91cC55b21pfe+8iVwiKS5hcHBlbmRUbyBkbFxyXG5cdFx0XHRcdHVsID0gJCgnPHVsIC8+JylcclxuXHJcblx0XHRcdFx0Xy5lYWNoIHNoaXBHcm91cC5zaGlwcywgKHNoaXApLT5cclxuXHRcdFx0XHRcdHNoaXBUeXBlID0gQ0lDLm1hc3RlcnMuc2hpcFR5cGVzW3NoaXAuc3R5cGVdXHJcblx0XHRcdFx0XHRsaSA9ICQgJzxsaSAvPidcclxuXHRcdFx0XHRcdFx0LmFwcGVuZCBcIjxzcGFuIGNsYXNzPSN7XCJzaGlwLXR5cGVcIn0+I3tzaGlwVHlwZS5uYW1lfTwvc3Bhbj5cIlxyXG5cdFx0XHRcdFx0XHQuYXBwZW5kIFwiPHNwYW4gY2xhc3M9I3tcInNoaXAtbmFtZVwifT4je3NoaXAubmFtZX08L3NwYW4+XCJcclxuXHRcdFx0XHRcdFx0LmFwcGVuZFRvIHVsXHJcblxyXG5cdFx0XHRcdGlmIHNoaXBHcm91cC5zaGlwcy5sZW5ndGggPT0gMFxyXG5cdFx0XHRcdFx0bGkgPSAkKCc8bGkgLz4nKS5hcHBlbmQoXCI8c3BhbiBjbGFzcz0je1wic2hpcC10eXBlXCJ9PuOBquOBlzwvc3Bhbj5cIikuYXBwZW5kVG8odWwpXHJcblxyXG5cdFx0XHRcdGRkID0gJCAnPGRkIC8+J1xyXG5cdFx0XHRcdHVsLmFwcGVuZFRvKGRkKVxyXG5cdFx0XHRcdGRkLmFwcGVuZFRvKGRsKVxyXG5cclxuXHRcdFx0IyDjgarjgZcg44Gu6KGo56S6XHJcblx0XHRcdGlmIG5vbk93bmVkLmxlbmd0aCA9PSAwXHJcblx0XHRcdFx0ZHQgPSAkKCc8ZHQgLz4nKS50ZXh0KFwi44Gq44GXXCIpLmFwcGVuZFRvIGRsXHJcblx0XHRcdFx0dWwgPSAkKCc8dWwgLz4nKVxyXG5cdFx0XHRcdGxpID0gJCgnPGxpIC8+JykudGV4dChcIuOBquOBl1wiKS5hcHBlbmRUbyB1bFxyXG5cdFx0XHRcdGRkID0gJCgnPGRkIC8+JykuYXBwZW5kKHVsKS5hcHBlbmRUbyBkbFxyXG5cclxuXHRcdFx0IyBDU1PjgajjgYLjgo/jgZvjgabjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLlrp/nj75cclxuXHRcdFx0JCgnI25vbm93bmVkLXNoaXBzJykuY2xvc2VzdCgnLm91dHB1dCcpLmFkZENsYXNzKCdzaG93JylcclxuXHRcdFx0JCgnI25vbm93bmVkLXNoaXBzJykuaHRtbChkbCkuY3NzIHtoZWlnaHQ6IGRsLm91dGVySGVpZ2h0KCl9XHJcblx0XHRcdGRsLmFkZENsYXNzKCdzaG93JylcclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMg6KOF5YKZ5qSc57Si77yI44K544Oa44O844K55Yy65YiH44KKQW5k5qSc57Si77yJXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0a2V5dXBFcXVpcG1lbnRJbnB1dDogKGUpLT5cclxuXHRcdFx0aWYgZS5rZXlDb2RlID09IDEzXHJcblx0XHRcdFx0QGZpbmRFcXVpcG1lbnQoKVxyXG5cclxuXHRcdGZpbmRFcXVpcG1lbnQ6ICgpLT5cclxuXHRcdFx0aWYgIUNJQy5hbmFseXplT3V0XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlXHJcblxyXG5cdFx0XHQjIOaknOe0ouaWh+Wtl+WIl+OBruWPluW+l1xyXG5cdFx0XHRzZWFyY2hUZXh0ID0gJCgnI3NlYXJjaC1lcXVpcG1lbnQtaW5wdXQnKS52YWwoKS50cmltKClcclxuXHRcdFx0aWYgc2VhcmNoVGV4dCA9PSAnJ1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZVxyXG5cdFx0XHRzZWFyY2hBcnJheSA9IHNlYXJjaFRleHQuc3BsaXQgL1xccy9cclxuXHJcblx0XHRcdCMg44K544Oa44O844K55Yy65YiH44KKQW5k5qSc57Si44Gu5a6f6KOFXHJcblx0XHRcdGZvdW5kRXF1aXBtZW50QmFzZSA9IF8uY2xvbmUgQ0lDLm1hc3RlcnMuZXF1aXBtZW50c1xyXG5cdFx0XHRfLmVhY2ggc2VhcmNoQXJyYXksIChzZWFyY2gpLT5cclxuXHRcdFx0XHRyZVNlYXJjaCA9IG5ldyBSZWdFeHAgc2VhcmNoLCAnaSdcclxuXHRcdFx0XHRmb3VuZEVxdWlwbWVudEJhc2UgPSBfLmZpbHRlciBmb3VuZEVxdWlwbWVudEJhc2UsIChlcXVpcCktPlxyXG5cdFx0XHRcdFx0KGVxdWlwLm5hbWUpLm1hdGNoIHJlU2VhcmNoXHJcblxyXG5cdFx0XHQjIOWQiOiHtOOBl+OBn+ijheWCmVxyXG5cdFx0XHRfLm1hcCBmb3VuZEVxdWlwbWVudEJhc2UsIChlcUJhc2UpPT5cclxuXHRcdFx0XHQjIOijheWCmeeoruWIpeOCkmpvaW7jgZnjgotcclxuXHRcdFx0XHRlcVR5cGUgPSBlcUJhc2UudHlwZVsyXVxyXG5cdFx0XHRcdGVxVHlwZU5hbWUgPSBDSUMubWFzdGVycy5lcXVpcG1lbnRUeXBlc1tlcVR5cGVdLm5hbWVcclxuXHRcdFx0XHRlcUJhc2UudHlwZU5hbWUgPSBlcVR5cGVOYW1lO1xyXG5cdFx0XHRcdGVxQmFzZS5mdWxsTmFtZSA9IFwiI3tlcVR5cGVOYW1lfSA6OiAje2VxQmFzZS5uYW1lfVwiXHJcblxyXG5cdFx0XHRcdCMg6Kmy5b2T44Gu6KOF5YKZ44KS6LyJ44Gb44Gm44GE44KL6ImmXHJcblx0XHRcdFx0c2VhcmNoSWQgPSBlcUJhc2UuaWRcclxuXHRcdFx0XHRzaGlwSGFzID0gW11cclxuXHRcdFx0XHRfLmVhY2ggQGFuYWx5emVkUG9ydCwgKHNoaXApLT5cclxuXHRcdFx0XHRcdCMg5LiA6Imm5LiK44Gu5pCt6LyJ5pWw44KS5pWw44GI44KLXHJcblx0XHRcdFx0XHRlcXVpcHBlZENvdW50T25TaGlwID0gMFxyXG5cdFx0XHRcdFx0Xy5lYWNoIHNoaXAuX2VxdWlwT2JqLCAoZXF1aXApLT5cclxuXHRcdFx0XHRcdFx0aWYgZXF1aXAuaWQgPT0gZXFCYXNlLmlkXHJcblx0XHRcdFx0XHRcdFx0ZXF1aXBwZWRDb3VudE9uU2hpcCsrXHJcblx0XHRcdFx0XHRpZiBlcXVpcHBlZENvdW50T25TaGlwXHJcblx0XHRcdFx0XHRcdHNoaXAu5pCt6LyJ5pWwID0gZXF1aXBwZWRDb3VudE9uU2hpcFxyXG5cdFx0XHRcdFx0XHRzaGlwSGFzLnB1c2ggc2hpcFxyXG5cclxuXHRcdFx0XHQjIOaJgOacieaVsOOCkuaVsOOBiOOCi1xyXG5cdFx0XHRcdG93bmVkQ291bnQgPSAwXHJcblx0XHRcdFx0Xy5lYWNoIENJQy50cmFuc2FjdGlvbnMubXlFcXVpcG1lbnRzLCAobXlFcXVpcCktPlxyXG5cdFx0XHRcdFx0aWYgbXlFcXVpcC5hcGlfc2xvdGl0ZW1faWQgPT0gZXFCYXNlLmlkXHJcblx0XHRcdFx0XHRcdG93bmVkQ291bnQrK1xyXG5cdFx0XHRcdGVxQmFzZS5fc2hpcEhhcyA9IHNoaXBIYXNcclxuXHRcdFx0XHRlcUJhc2UuX293bmVkQ291bnQgPSBvd25lZENvdW50XHJcblxyXG5cdFx0XHQjIOODrOODs+ODgOODquODs+OCsFxyXG5cdFx0XHRAcmVuZGVyRm91bmRFcXVpcG1lbnRzIGZvdW5kRXF1aXBtZW50QmFzZVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDopovjgaTjgYvjgaPjgZ/oo4XlgpnjgajmkK3ovInoiabjga7ooajnpLpcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRyZW5kZXJGb3VuZEVxdWlwbWVudHM6IChmb3VuZHMpLT5cclxuXHRcdFx0ZGwgPSAkKCc8ZGwgLz4nKS5hdHRyKHtpZDogJ2ZvdW5kLWVxdWlwbWVudHMtbGlzdCd9KVxyXG5cclxuXHRcdFx0Xy5lYWNoIGZvdW5kcywgKGVxdWlwKS0+XHJcblx0XHRcdFx0aWYgZXF1aXAuc29ydG5vID09IDBcclxuXHRcdFx0XHRcdCMg5rex5rW36KOF5YKZ44KS44K544Kt44OD44OXXHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZVxyXG5cdFx0XHRcdGR0ID0gJCAnPGR0IC8+J1xyXG5cdFx0XHRcdFx0LnRleHQoZXF1aXAuZnVsbE5hbWUpLmFwcGVuZFRvKGRsKVxyXG5cdFx0XHRcdGRkID0gJCAnPGRkIC8+J1xyXG5cdFx0XHRcdHVsID0gJCAnPHVsIC8+J1xyXG5cclxuXHRcdFx0XHRzaGlwSGFzID0gXy5zb3J0QnkgZXF1aXAuX3NoaXBIYXMsIChzaGlwKS0+XHJcblx0XHRcdFx0XHRzaGlwLkx2XHJcblxyXG5cdFx0XHRcdCMg6Imm44GU44Go44Gr5pCt6LyJ5pWw44KS6KGo56S6XHJcblx0XHRcdFx0ZnJlZUVxdWlwQ291bnQgPSBlcXVpcC5fb3duZWRDb3VudFxyXG5cdFx0XHRcdF8uZWFjaCBzaGlwSGFzLCAoc2hpcCktPlxyXG5cdFx0XHRcdFx0bGkgPSAkICc8bGkgLz4nXHJcblx0XHRcdFx0XHRcdC5hcHBlbmQgXCI8c3BhbiBjbGFzcz0je1wic2hpcC1jb3VudFwifT4je3NoaXAu5pCt6LyJ5pWwfcOXPC9zcGFuPlwiXHJcblx0XHRcdFx0XHRcdC5hcHBlbmQgXCI8c3BhbiBjbGFzcz0je1wic2hpcC10eXBlXCJ9PiN7c2hpcC7oiabnqK59PC9zcGFuPlwiXHJcblx0XHRcdFx0XHRcdC5hcHBlbmQgXCI8c3BhbiBjbGFzcz0je1wic2hpcC1uYW1lXCJ9PiN7c2hpcC7oiablkI19PC9zcGFuPlwiXHJcblx0XHRcdFx0XHRcdC5hcHBlbmQgXCI8c3BhbiBjbGFzcz0je1wic2hpcC1sdlwifT5Mdi4je3NoaXAuTHZ9PC9zcGFuPlwiXHJcblx0XHRcdFx0XHRcdC5hcHBlbmRUbyB1bFxyXG5cdFx0XHRcdFx0ZnJlZUVxdWlwQ291bnQgLT0gc2hpcC7mkK3ovInmlbBcclxuXHJcblx0XHRcdFx0aWYgZXF1aXAuX293bmVkQ291bnQgIT0gMFxyXG5cdFx0XHRcdFx0IyDpgYrpm6LmlbBcclxuXHRcdFx0XHRcdGxpID0gJCAnPGxpIC8+J1xyXG5cdFx0XHRcdFx0XHQuYXBwZW5kIFwiPHNwYW4gY2xhc3M9I3tcInNoaXAtY291bnRcIn0+I3tmcmVlRXF1aXBDb3VudH3Dlzwvc3Bhbj5cIlxyXG5cdFx0XHRcdFx0XHQuYXBwZW5kIFwiPHNwYW4gY2xhc3M9I3tcInNoaXAtdHlwZVwifT7pgYrpm6I8L3NwYW4+XCJcclxuXHRcdFx0XHRcdFx0LnByZXBlbmRUbyB1bFxyXG5cdFx0XHRcdFx0IyDlhajmiYDmjIHmlbBcclxuXHRcdFx0XHRcdGxpID0gJCAnPGxpIC8+J1xyXG5cdFx0XHRcdFx0XHQuYXBwZW5kIFwiPHNwYW4gY2xhc3M9I3tcInNoaXAtY291bnRcIn0+I3tlcXVpcC5fb3duZWRDb3VudH3Dlzwvc3Bhbj5cIlxyXG5cdFx0XHRcdFx0XHQuYXBwZW5kIFwiPHNwYW4gY2xhc3M9I3tcInNoaXAtdHlwZVwifT7lhajkvZM8L3NwYW4+XCJcclxuXHRcdFx0XHRcdFx0LnByZXBlbmRUbyB1bFxyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdGxpID0gJCAnPGxpIC8+J1xyXG5cdFx0XHRcdFx0XHQuYXBwZW5kIFwiPHNwYW4gY2xhc3M9I3tcInNoaXAtdHlwZVwifT7jgarjgZc8L3NwYW4+XCJcclxuXHRcdFx0XHRcdFx0LmFwcGVuZFRvIHVsXHJcblxyXG5cdFx0XHRcdHVsLmFwcGVuZFRvKGRkKVxyXG5cdFx0XHRcdGRkLmFwcGVuZFRvKGRsKVxyXG5cclxuXHRcdFx0IyBDU1PjgajjgYLjgo/jgZvjgabjgqLjg4vjg6Hjg7zjgrfjg6fjg7PjgpLlrp/nj75cclxuXHRcdFx0JCgnI3NlYXJjaC1yZXN1bHQnKS5jbG9zZXN0KCcub3V0cHV0JykuYWRkQ2xhc3MoJ3Nob3cnKVxyXG5cdFx0XHQkKCcjc2VhcmNoLXJlc3VsdCcpLmh0bWwoZGwpLmNzcyB7aGVpZ2h0OiBkbC5vdXRlckhlaWdodCgpfVxyXG5cdFx0XHRkbC5hZGRDbGFzcygnc2hvdycpXHJcblx0XHRcdGNvbnNvbGUubG9nIFwi5ZCI6Ie044GX44Gf6KOF5YKZ44Gu44Oe44K544K/XCJcclxuXHRcdFx0Y29uc29sZS5sb2cgXy5pbmRleEJ5KGZvdW5kcywgJ25hbWUnKVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDoiaZiYXNl5Ye65YqbXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0a2V5dXBCYXNlSW5wdXQ6IChlKS0+XHJcblx0XHRcdGlmIGUua2V5Q29kZSA9PSAxM1xyXG5cdFx0XHRcdEBmaW5kU2hpcEJhc2UoKVxyXG5cdFx0ZmluZFNoaXBCYXNlOiAoKS0+XHJcblx0XHRcdCMg5qSc57Si5paH5a2X5YiX44Gu5Y+W5b6XXHJcblx0XHRcdHNlYXJjaFRleHQgPSAkKCcjYmFzZS1zaGlwLWlucHV0JykudmFsKCkudHJpbSgpXHJcblx0XHRcdGlmIHNlYXJjaFRleHQgPT0gJydcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2VcclxuXHRcdFx0c2VhcmNoQXJyYXkgPSBzZWFyY2hUZXh0LnNwbGl0IC9cXHMvXHJcblxyXG5cdFx0XHQjIOOCueODmuODvOOCueWMuuWIh+OCikFuZOaknOe0ouOBruWun+ijhVxyXG5cdFx0XHRmb3VuZFNoaXBCYXNlID0gXy5jbG9uZSBDSUMubWFzdGVycy5zaGlwc1xyXG5cdFx0XHRfLmVhY2ggc2VhcmNoQXJyYXksIChzZWFyY2gpLT5cclxuXHRcdFx0XHRyZVNlYXJjaCA9IG5ldyBSZWdFeHAgc2VhcmNoLCAnaSdcclxuXHRcdFx0XHRmb3VuZFNoaXBCYXNlID0gXy5maWx0ZXIgZm91bmRTaGlwQmFzZSwgKHNoaXApLT5cclxuXHRcdFx0XHRcdChzaGlwLm5hbWUpLm1hdGNoIHJlU2VhcmNoXHJcblxyXG5cdFx0XHQjIOWQiOiHtOOBl+OBn+iJpmJhc2VcclxuXHRcdFx0Y29uc29sZS5sb2cgXCLlkIjoh7TjgZfjgZ/oiabjg57jgrnjgr9cIlxyXG5cdFx0XHRjb25zb2xlLmxvZyBmb3VuZFNoaXBCYXNlXHJcblx0XHRcdGlmICFDSUMuYW5hbHl6ZU91dFxyXG5cdFx0XHRcdHJldHVybiBmYWxzZVxyXG5cclxuXHRcdFx0Y29uc29sZS5sb2cgXCLlkIjoh7TjgZfjgZ/miYDmnInoiaZcIlxyXG5cdFx0XHRfLmVhY2ggZm91bmRTaGlwQmFzZSwgKHNoaXBCYXNlKT0+XHJcblx0XHRcdFx0IyDjga7lrp/jgqTjg7Pjgrnjgr/jg7PjgrlcclxuXHRcdFx0XHRzZWFyY2hJZCA9IHNoaXBCYXNlLmlkXHJcblx0XHRcdFx0Zm91bmRTaGlwSW5zdGFuY2VzID0gXy5maWx0ZXIgQGFuYWx5emVkUG9ydCwgKHNoaXApLT5cclxuXHRcdFx0XHRcdHJldHVybiBzaGlwLl9iYXNlSWQgPT0gc2hpcEJhc2UuaWRcclxuXHJcblx0XHRcdFx0aWYgZm91bmRTaGlwSW5zdGFuY2VzLmxlbmd0aFxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2cgXCItICN7c2hpcEJhc2UubmFtZX1cIlxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2cgZm91bmRTaGlwSW5zdGFuY2VzXHJcblxyXG5cclxuXHRcdHJlbmRlckxldmVsQ2hhcnQ6IC0+XHJcblx0XHRcdCMg5ZCE44Os44OZ44Or56+E5Zuy44KS6YWN5YiX44Gn5L2c5oiQXHJcblx0XHRcdGxldmVsU2VjdGlvbiA9IF8ucmFuZ2UoMSwgMTUwLCAxMClcclxuXHJcblx0XHRcdCMg44OH44O844K/57O75YiX77yI6Imm56iu77yJ44KS5L2c5oiQXHJcblx0XHRcdHNoaXBUeXBlcyA9IF8uY291bnRCeSBAYW5hbHl6ZWRQb3J0LCAoc2hpcCktPlxyXG5cdFx0XHRcdHNoaXAu6Imm56iuXHJcblx0XHRcdHNoaXBUeXBlTmFtZXMgPSBfLm1hcCBzaGlwVHlwZXMsIChjb3VudCwgdHlwZSktPlxyXG5cdFx0XHRcdHR5cGVcclxuXHRcdFx0c2hpcFR5cGVOYW1lcy5yZXZlcnNlKCkudW5zaGlmdCgnJylcclxuXHJcblx0XHRcdCMg5Ye65Yqb44Kq44OW44K444Kn44Kv44OI44Gu6Zub5b2iXHJcblx0XHRcdGxldmVsT2JqID0gXy5tYXAgbGV2ZWxTZWN0aW9uLCAoaW5pdGlhbExldmVsKS0+XHJcblx0XHRcdFx0IyDoiabnqK7jga7mlbDjgaDjgZHjgrzjg63jgafln4vjgoHjgotcclxuXHRcdFx0XHRpbml0Q291bnRlciA9IFtdXHJcblx0XHRcdFx0XyhzaGlwVHlwZU5hbWVzLmxlbmd0aCkudGltZXMgLT5cclxuXHRcdFx0XHRcdGluaXRDb3VudGVyLnB1c2ggMFxyXG5cclxuXHRcdFx0XHQjIOWFiOmgreOBq+ODqeODmeODq1xyXG5cdFx0XHRcdGluaXRDb3VudGVyWzBdID0gXCIje2luaXRpYWxMZXZlbH3vvZ5cIlxyXG5cdFx0XHRcdGluaXRDb3VudGVyXHJcblxyXG5cdFx0XHQjIOWQiOiHtOOBmeOCi+ODrOODmeODq+evhOWbsuOBruaVsOWApOOCkjHlopfjgoTjgZlcclxuXHRcdFx0c2hpcENvdW50ID0gMFxyXG5cdFx0XHR0b3RhbEV4cCA9IDBcclxuXHRcdFx0Xy5lYWNoIEBhbmFseXplZFBvcnQsIChzaGlwKS0+XHJcblx0XHRcdFx0IyDlkIjoh7TjgZnjgovjg6zjg5njg6vnr4Tlm7JJRFxyXG5cdFx0XHRcdHNlY3Rpb25JZCA9IF8uc29ydGVkSW5kZXgobGV2ZWxTZWN0aW9uLCBzaGlwLkx2KzEpIC0gMVxyXG5cdFx0XHRcdCMg6Imm56iuSURcclxuXHRcdFx0XHRzaGlwVHlwZUlkID0gXy5pbmRleE9mIHNoaXBUeXBlTmFtZXMsIHNoaXAu6Imm56iuXHJcblx0XHRcdFx0IyDlkIjoh7TjgZfjgZ/ooajjga7jg57jgrnjgpIx5aKX44KE44GZXHJcblx0XHRcdFx0bGV2ZWxPYmpbc2VjdGlvbklkXVtzaGlwVHlwZUlkXSsrXHJcblx0XHRcdFx0IyDntYzpqJPlgKTlkIjoqIjjgpLlj5blvpdcclxuXHRcdFx0XHRzaGlwQ291bnQrK1xyXG5cdFx0XHRcdHRvdGFsRXhwICs9IHNoaXAu57WM6aiT5YCkLuepjeeul1xyXG5cclxuXHRcdFx0IyDntbHoqIjmg4XloLHkv53lrZhcclxuXHRcdFx0Q0lDLnN0YXRpc3RpY3Muc2hpcENvdW50ID0gc2hpcENvdW50XHJcblx0XHRcdENJQy5zdGF0aXN0aWNzLnRvdGFsRXhwcyA9IHMubnVtYmVyRm9ybWF0KHRvdGFsRXhwLCAwLCAnLicsICcsJylcclxuXHJcblx0XHRcdCMg44Op44OZ44Or5L2c5oiQXHJcblx0XHRcdGxldmVsT2JqLnVuc2hpZnQgc2hpcFR5cGVOYW1lc1xyXG5cclxuXHRcdFx0IyDmj4/nlLtcclxuXHRcdFx0ZGF0YSA9IGdvb2dsZS52aXN1YWxpemF0aW9uLmFycmF5VG9EYXRhVGFibGUgbGV2ZWxPYmpcclxuXHRcdFx0b3B0aW9ucyA9XHJcblx0XHRcdFx0aXNTdGFja2VkOiB0cnVlXHJcblx0XHRcdFx0Y29ubmVjdFN0ZXBzOiBmYWxzZVxyXG5cdFx0XHRcdHdpZHRoOiA5MDBcclxuXHRcdFx0XHRoZWlnaHQ6IDUwMFxyXG5cdFx0XHRcdHNlbGVjdGlvbk1vZGU6ICdtdWx0aXBsZSdcclxuXHRcdFx0XHRjaGFydEFyZWE6XHJcblx0XHRcdFx0XHR3aWR0aDogJzc3JSdcclxuXHRcdFx0XHRcdGhlaWdodDogJzkxJSdcclxuXHRcdFx0XHRcdHRvcDogMjBcclxuXHRcdFx0XHRcdGxlZnQ6IDUwXHJcblx0XHRcdFx0aEF4aXM6XHJcblx0XHRcdFx0XHR0ZXh0U3R5bGU6XHJcblx0XHRcdFx0XHRcdGZvbnRTaXplOiAxMlxyXG5cdFx0XHRcdGNvbG9yczogWycjMDI4ZTliJywgJyM0Mzc0ZTAnLCAnIzUzYThmYicsICcjZjFjYTNhJywgJyNlNDkzMDcnLCAnIzAwMDAwMCcsICcjODg4ODg4JywgJyNjY2NjY2MnLCAnI2ZmNzgwMCddXHJcblxyXG5cdFx0XHRjaGFydCA9IG5ldyBnb29nbGUudmlzdWFsaXphdGlvbi5TdGVwcGVkQXJlYUNoYXJ0ICQoJyNsZXZlbC1jaGFydCcpLmdldCgwKVxyXG5cdFx0XHRjaGFydC5kcmF3IGRhdGEsIG9wdGlvbnNcclxuXHJcblx0XHRcdCMg5YWo5L2T57Wx6KiI5YCkXHJcblx0XHRcdHRlbXBsYXRlT3ZlcmFsbCA9IF8udGVtcGxhdGUgJCgnI3Qtb3ZlcmFsbC1jb250ZW50JykudGV4dCgpLnRyaW0oKVxyXG5cdFx0XHQkICcjb3ZlcmFsbC1zdGF0J1xyXG5cdFx0XHRcdC5lbXB0eSgpXHJcblx0XHRcdFx0LmFwcGVuZCB0ZW1wbGF0ZU92ZXJhbGxcclxuXHRcdFx0XHRcdHNoaXBDb3VudDogQ0lDLnN0YXRpc3RpY3Muc2hpcENvdW50XHJcblx0XHRcdFx0XHRkaXN0aW5jdFNoaXBDb3VudDogQ0lDLnN0YXRpc3RpY3MuYWxsRGlzdGluY3RPd25lZFxyXG5cdFx0XHRcdFx0dG90YWxFeHBzOiBDSUMuc3RhdGlzdGljcy50b3RhbEV4cHNcclxuXHRcdFx0XHRcdGZhaWxlZE1pc3Npb25zOiBDSUMuc3RhdGlzdGljcy5mYWlsZWRNaXNzaW9uc1xyXG5cclxuXHRcdFx0IyDnlLvpnaLlj43mmKBcclxuXHRcdFx0JCgnLmxldmVsLWhpc3RncmFtJykuYWRkQ2xhc3MoJ3Nob3cnKVxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDnp5LjgpLmmYLliIbnp5Ljga7jg4bjgq3jgrnjg4jjgatcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRzZWNvbmRUb0hvdXI6IChtaWxsaXNlYywgc3R5bGUpLT5cclxuXHRcdFx0c2VjID0gbWlsbGlzZWMvMTAwMFxyXG5cdFx0XHRob3VyID0gcGFyc2VJbnQgc2VjLzM2MDBcclxuXHRcdFx0c2VjID0gc2VjJTM2MDBcclxuXHRcdFx0bWludXRlID0gcGFyc2VJbnQgc2VjLzYwXHJcblx0XHRcdHNlYyA9IHNlYyU2MFxyXG5cdFx0XHRzZWNvbmQgPSBwYXJzZUludCBzZWNcclxuXHRcdFx0bWludXRlID0gcy5scGFkIG1pbnV0ZSwgMiwgJzAnXHJcblx0XHRcdHNlY29uZCA9IHMubHBhZCBzZWNvbmQsIDIsICcwJ1xyXG5cclxuXHRcdFx0aWYgc3R5bGUgPT0gJ2RlZ3JlZSdcclxuXHRcdFx0XHR1bml0cyA9IHtoOiAnwrAnLCBtOiAn4oCyJywgczogJ+KAsyd9XHJcblx0XHRcdGVsc2UgaWYgc3R5bGUgPT0gJ2NvbG9ucydcclxuXHRcdFx0XHR1bml0cyA9IHtoOiAnOicsIG06ICc6JywgczogJyd9XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHR1bml0cyA9IHtoOiAn5pmC6ZaTJywgbTogJ+WIhicsIHM6ICfnp5InfVxyXG5cclxuXHRcdFx0b3V0ID0gW11cclxuXHRcdFx0aWYgaG91ciA+IDBcclxuXHRcdFx0XHRvdXQucHVzaCBob3VyXHJcblx0XHRcdFx0b3V0LnB1c2ggdW5pdHMuaFxyXG5cdFx0XHRpZiBtaW51dGUgPiAwIHx8IGhvdXIgPiAwXHJcblx0XHRcdFx0b3V0LnB1c2ggbWludXRlXHJcblx0XHRcdFx0b3V0LnB1c2ggdW5pdHMubVxyXG5cdFx0XHRpZiBtaW51dGUgPiAwIHx8IGhvdXIgPiAwIHx8IHNlY29uZCA+IDBcclxuXHRcdFx0XHRvdXQucHVzaCBzZWNvbmRcclxuXHRcdFx0XHRvdXQucHVzaCB1bml0cy5zXHJcblxyXG5cdFx0XHRyZXR1cm4gb3V0LmpvaW4gJydcclxuXHJcblxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdCMg44K544Kv44Ot44O844Or44Gr44OY44OD44OA44KS6L+95b6TXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0c2Nyb2xsV2luZG93OiAoZSktPlxyXG5cdFx0XHRpZiAhQ0lDLmFuYWx5emVPdXRcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2VcclxuXHJcblx0XHRcdG5vcm1hbCA9ICQgJyNzaGlwLXRhYmxlJ1xyXG5cdFx0XHRzdGlja3kgPSAkICcjc2hpcC10YWJsZS1zdGlja3knXHJcblxyXG5cdFx0XHRfLmRlYm91bmNlKCAtPlxyXG5cdFx0XHRcdHRocmVzaG9sZCA9IG5vcm1hbC5vZmZzZXQoKS50b3BcclxuXHRcdFx0XHRsaW1pdCA9IHRocmVzaG9sZCArIG5vcm1hbC5vdXRlckhlaWdodCgpXHJcblx0XHRcdFx0c2Nyb2xsZWQgPSAkKCdib2R5Jykuc2Nyb2xsVG9wKClcclxuXHRcdFx0XHRpZiBsaW1pdCA8IHNjcm9sbGVkXHJcblx0XHRcdFx0XHRzdGlja3kucmVtb3ZlQ2xhc3MoJ2hvbGQnKS5jc3Mge3RvcDogMH1cclxuXHRcdFx0XHRcdG5vcm1hbC5yZW1vdmVDbGFzcygnaG9sZCcpXHJcblx0XHRcdFx0ZWxzZSBpZiB0aHJlc2hvbGQgPCBzY3JvbGxlZFxyXG5cdFx0XHRcdFx0c3RpY2t5LmFkZENsYXNzKCdob2xkJykuc3RvcCgpLmNzcyB7dG9wOiBzY3JvbGxlZH1cclxuXHRcdFx0XHRcdG5vcm1hbC5hZGRDbGFzcygnaG9sZCcpXHJcblx0XHRcdFx0ZWxzZVxyXG5cdFx0XHRcdFx0c3RpY2t5LnJlbW92ZUNsYXNzKCdob2xkJykuY3NzIHt0b3A6IDB9XHJcblx0XHRcdFx0XHRub3JtYWwucmVtb3ZlQ2xhc3MoJ2hvbGQnKVxyXG5cdFx0XHQsIDUwKSgpXHJcblxyXG5cclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHQjIOaVsOWtl+OCkuW+kOOAheOBq+i/keOBpeOBkeOCi1xyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdG51bWJlckRydW06ICgkZWxtLCB0bywgZHVyYXRpb24pLT5cclxuXHRcdFx0aW50ZXJ2YWwgPSA0MFxyXG5cdFx0XHRzdGVwID0gMFxyXG5cdFx0XHRuZXh0ID0gZnJvbSA9IHBhcnNlSW50ICRlbG0udGV4dCgpLCAxMFxyXG5cdFx0XHRkaWZmID0gdG8gLSBmcm9tXHJcblxyXG5cdFx0XHRhbGxTdGVwcyA9IGR1cmF0aW9uIC8gaW50ZXJ2YWxcclxuXHRcdFx0ZWFzaW5nRnVuY3Rpb24gPSAocHJvZ3Jlc3MpLT5cclxuXHRcdFx0XHQjIOWkieaVsOWfn+WkieaPmyAwLi4xIC0+IC0yLi4wXHJcblx0XHRcdFx0YXJndiA9IChwcm9ncmVzcy0xKSozXHJcblx0XHRcdFx0IyB5ID0geF4zXHJcblx0XHRcdFx0cmVzdWx0ID0gTWF0aC5wb3coYXJndiwgMylcclxuXHRcdFx0XHQjIOWApOWfn+WkieaPmyAtMjcuLjAgLT4gMC4uMVxyXG5cdFx0XHRcdHJldHVybiByZXN1bHQvMjcgKyAxXHJcblxyXG5cclxuXHRcdFx0c3RhcnRUaW1lID0gK25ldyBEYXRlKClcclxuXHRcdFx0cmVwZWF0ZXIgPSBzZXRJbnRlcnZhbCAoKS0+XHJcblx0XHRcdFx0XHRwYXNzZWRUaW1lID0gbmV3IERhdGUoKSAtIHN0YXJ0VGltZVxyXG5cdFx0XHRcdFx0cHJvZ3Jlc3MgPSBNYXRoLm1pbiBwYXNzZWRUaW1lIC8gZHVyYXRpb24sIDFcclxuXHRcdFx0XHRcdHZhbHVlID0gZnJvbSArIGRpZmYqZWFzaW5nRnVuY3Rpb24ocHJvZ3Jlc3MpXHJcblx0XHRcdFx0XHQkZWxtLnRleHQocGFyc2VJbnQgdmFsdWUsIDEwKVxyXG5cdFx0XHRcdCwgaW50ZXJ2YWxcclxuXHJcblx0XHRcdHNldFRpbWVvdXQgKCktPlxyXG5cdFx0XHRcdFx0Y2xlYXJJbnRlcnZhbCByZXBlYXRlclxyXG5cdFx0XHRcdFx0JGVsbS50ZXh0KHBhcnNlSW50IHRvLCAxMClcclxuXHRcdFx0XHQsIGR1cmF0aW9uKzEwMFxyXG5cclxuXHJcblx0XHQjIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0IyDjgqrjg7zjg5Djg6zjgqTjga7oqK3nva7jgIHop6PpmaRcclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHRvdmVybGF5OiAoYW5ub3VuY2VtZW50KS0+XHJcblx0XHRcdGxheWVyID0gLT5cclxuXHRcdFx0XHRpZiBhbm5vdW5jZW1lbnRcclxuXHRcdFx0XHRcdEBzZXQoYW5ub3VuY2VtZW50KVxyXG5cdFx0XHRcdGVsc2VcclxuXHRcdFx0XHRcdEB1bnNldCgpXHJcblxyXG5cdFx0XHRsYXllcjo6c2V0ID0gKGFubm91bmNlbWVudCktPlxyXG5cdFx0XHRcdGxvYWRlciA9ICQoJzxkaXYgLz4nKS5hZGRDbGFzcygnbG9hZGVyJykuYXR0cignaWQnLCAnbG9hZGVyJykudGV4dChhbm5vdW5jZW1lbnQpLnByZXBlbmRUbygnYm9keScpXHJcblx0XHRcdFx0dk9mZnNldCA9ICgkKHdpbmRvdykuaGVpZ2h0KCkgLSBsb2FkZXIub3V0ZXJIZWlnaHQoKSkgLzJcclxuXHRcdFx0XHRoT2Zmc2V0ID0gKCQod2luZG93KS53aWR0aCgpIC0gbG9hZGVyLm91dGVyV2lkdGgoKSkgLzJcclxuXHRcdFx0XHQkKCcjbG9hZGVyJykuY3NzIHt0b3A6IHZPZmZzZXQsIGxlZnQ6IGhPZmZzZXQsIHBvc2l0aW9uOiAnZml4ZWQnfVxyXG5cclxuXHRcdFx0XHRvdmVybGF5ID0gJCgnPGRpdiAvPicpLmFkZENsYXNzKCdvdmVybGF5JykuYXR0clxyXG5cdFx0XHRcdFx0aWQ6ICdvdmVybGF5J1xyXG5cdFx0XHRcdFx0b25DbGljazogJ2phdmFzY3JpcHQ6IHJldHVybiBmYWxzZTsnXHJcblx0XHRcdFx0LmNzcyBoZWlnaHQ6ICQoZG9jdW1lbnQpLmhlaWdodCgpXHJcblxyXG5cdFx0XHRcdCQoJ2JvZHknKS5wcmVwZW5kIG92ZXJsYXlcclxuXHJcblx0XHRcdGxheWVyOjp1bnNldCA9IC0+XHJcblx0XHRcdFx0JCgnI292ZXJsYXksICNsb2FkZXInKS5yZW1vdmUoKVxyXG5cclxuXHRcdFx0bmV3IGxheWVyKClcclxuXHJcblxyXG5cclxuXHRcdCMjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblx0XHQjIOWFqOeUu+mdouODoeODg+OCu+ODvOOCuOOBruihqOekulxyXG5cdFx0IyMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdG5vdGlmeTogKG1lc3NhZ2UpLT5cclxuXHJcblx0XHRcdCMg6KaB57Sg5rqW5YKZXHJcblx0XHRcdHN0YXRlbWVudCA9ICQgJzxwIC8+J1xyXG5cdFx0XHRcdC5hZGRDbGFzcyAnbm90aWZpY2F0aW9uLXN0YXRlbWVudCdcclxuXHRcdFx0XHQudGV4dCBtZXNzYWdlXHJcblx0XHRcdG5vdGlmaWNhdGlvbiA9ICQgJzxkaXYgLz4nXHJcblx0XHRcdFx0LmFwcGVuZCBzdGF0ZW1lbnRcclxuXHRcdFx0XHQuYWRkQ2xhc3MgJ2Z1bGxzY3JlZW4tbm90aWZpY2F0aW9uJ1xyXG5cdFx0XHRcdC5wcmVwZW5kVG8gJ2JvZHknXHJcblxyXG5cdFx0XHQjIOS9jee9ruWQiOOBm1xyXG5cdFx0XHR2T2Zmc2V0ID0gKCQod2luZG93KS5oZWlnaHQoKSAtIHN0YXRlbWVudC5vdXRlckhlaWdodCgpKSAvMlxyXG5cdFx0XHRoT2Zmc2V0ID0gKCQod2luZG93KS53aWR0aCgpIC0gc3RhdGVtZW50Lm91dGVyV2lkdGgoKSkgLzJcclxuXHRcdFx0c3RhdGVtZW50XHJcblx0XHRcdFx0LmNzcyB7dG9wOiB2T2Zmc2V0LCBsZWZ0OiBoT2Zmc2V0fVxyXG5cclxuXHRcdFx0IyDli5XjgY3jgpLjgaTjgZHjgablrozkuoblvozmtojjgZlcclxuXHRcdFx0bm90aWZpY2F0aW9uLmFkZENsYXNzICdyZWFkYWJsZSdcclxuXHRcdFx0c2V0VGltZW91dCAtPlxyXG5cdFx0XHRcdFx0IyDli5XjgY3jgpLjgaTjgZHjgablrozkuoblvozmtojjgZlcclxuXHRcdFx0XHRcdG5vdGlmaWNhdGlvbi5hZGRDbGFzcyAnZmx1c2gnXHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0IC0+XHJcblx0XHRcdFx0XHRcdFx0bm90aWZpY2F0aW9uLnJlbW92ZSgpXHJcblx0XHRcdFx0XHRcdCwgNjMwXHJcblx0XHRcdFx0LCA0MDBcclxuXHJcblxyXG5cclxuXHJcblx0YW5iayA9IG5ldyBkZXV0ZXJpdW1DSUMoKVxyXG4iXX0=