# あなぼこ -あなたの母港-
艦これのデータを綺麗にまとめて表示します。

![サンプル](https://raw.githubusercontent.com/airosB/Anaboko/master/img/hero.png)


## 動作デモ
[動作デモ](http://volkarten.appspot.com/demo/anaboko.html)

Chrome以外のブラウザでは一部表示が崩れるようです。

## 機能
- 艦隊の編成と装備を一覧表示
- クリック一発で編成装備内容をクリップボードにコピー
- 全艦のレベル分布表示
- 装備品の検索
- 近代化改修の終わっていない艦を列挙
- 入渠時間の長い順にソート
- 実装済みで未所持の艦を一覧表示

## 使い方
- 艦これを普通に起動して、サーバから送られてくるJSONをお好みの方法で保存してください。
- 具体的には、`start2`, `slotitem`, `port`のJSONの内容を、それぞれ`json/def_base.json`, `json/api_slotitem.json`, `json/api_port.json`内の`svdata=`にそのまま書き出せばOKです。

※api_port.jsonの例

    ;CIC._transactions =
    svdata=（ここにportの内容を貼り付ける）
    .api_data;

すべて完了したら`anaboko.html`をブラウザで開き、analyzeボタンを押してください。

## ライセンス
MIT License
