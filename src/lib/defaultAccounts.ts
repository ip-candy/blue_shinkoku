export const defaultAccounts = [
    // 資産 (ASSET)
    { name: '現金', type: 'ASSET', description: '手元の現金' },
    { name: '普通預金', type: 'ASSET', description: '事業用口座の預金' },
    { name: '売掛金', type: 'ASSET', description: '未回収の売上代金' },
    { name: '棚卸資産', type: 'ASSET', description: '商品・製品の在庫' },
    { name: '備品', type: 'ASSET', description: 'パソコンなど1年以上使用で10万円以上の物品' },
    { name: '車両運搬具', type: 'ASSET', description: '自動車・バイクなど' },
    { name: '工具器具備品', type: 'ASSET', description: '事業用に使われる工具や器具' },
    { name: 'ソフトウェア', type: 'ASSET', description: '購入または自作のソフトウェア' },

    // 負債 (LIABILITY)
    { name: '買掛金', type: 'LIABILITY', description: '未払いの仕入代金' },
    { name: '未払金', type: 'LIABILITY', description: '後払いの経費など' },

    // 純資産 (EQUITY)
    { name: '元入金', type: 'EQUITY', description: '事業主の元手' },
    { name: '事業主借', type: 'EQUITY', description: '個人から事業への資金移動' },
    { name: '事業主貸', type: 'EQUITY', description: '事業から個人への資金移動' },

    // 収益 (REVENUE)
    { name: '売上高', type: 'REVENUE', description: '事業の主な収入' },
    { name: '雑収入', type: 'REVENUE', description: '本業以外の少額な収入' },

    // 費用 (EXPENSE) — 青色申告決算書の番号順
    { name: '租税公課', type: 'EXPENSE', description: '固定資産税、自動車税などの税金や公的な負担金' },       // ⑧
    { name: '荷造運賃', type: 'EXPENSE', description: '商品の梱包・発送にかかる費用' },                     // ⑨
    { name: '水道光熱費', type: 'EXPENSE', description: '電気・ガス・水道代' },                             // ⑩
    { name: '旅費交通費', type: 'EXPENSE', description: '電車代・バス代・宿泊費など' },                      // ⑪
    { name: '通信費', type: 'EXPENSE', description: 'インターネット・携帯電話代など' },                      // ⑫
    { name: '広告宣伝費', type: 'EXPENSE', description: '広告・宣伝にかかる費用' },                         // ⑬
    { name: '接待交際費', type: 'EXPENSE', description: '取引先との飲食代や贈答品など' },                    // ⑭
    { name: '損害保険料', type: 'EXPENSE', description: '事業に関する損害保険の保険料' },                    // ⑮
    { name: '修繕費', type: 'EXPENSE', description: '店舗や備品の修理代' },                                 // ⑯
    { name: '消耗品費', type: 'EXPENSE', description: '10万円未満の物品購入費など' },                        // ⑰
    { name: '減価償却費', type: 'EXPENSE', description: '固定資産などの価値減少分' },                        // ⑱
    { name: '福利厚生費', type: 'EXPENSE', description: '従業員の福利厚生に関する費用' },                    // ⑲
    { name: '給料賃金', type: 'EXPENSE', description: '従業員への給与・賞与' },                             // ⑳
    { name: '外注工賃', type: 'EXPENSE', description: '外部の業者や個人への業務委託費' },                    // ㉑
    { name: '利子割引料', type: 'EXPENSE', description: '借入金の利息や手形割引料' },                        // ㉒
    { name: '地代家賃', type: 'EXPENSE', description: '事務所や店舗の家賃' },                               // ㉓
    { name: '貸倒金', type: 'EXPENSE', description: '回収不能となった売掛金等' },                            // ㉔
    { name: '雑費', type: 'EXPENSE', description: '他の科目に当てはまらない少額な経費' },                    // ㉛
    { name: '仕入高', type: 'EXPENSE', description: '商品の仕入原価' },                                     // ③
    { name: '支払手数料', type: 'EXPENSE', description: '振込手数料や仲介手数料など' },
    { name: '専従者給与', type: 'EXPENSE', description: '青色事業専従者（家族従業員）への給与' },             // ㊳
]
