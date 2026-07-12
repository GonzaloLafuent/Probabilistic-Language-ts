export const primitive_1 = '42'
export const primitive_2 = 'true'

export const primitive_function_1 = '(+ 1 2)'
export const primitive_function_2 = '(* (+ 1 2) 4)'

export const let_expression_1 = '(let [x 5] x)'
export const let_expression_2 = '(let [x 5] (+ x 2))'
export const let_expression_3 = '(let [x 2] (let [y 3] (+ x y)))'
export const let_expression_4 = '(let [x 1] (let [x 10] x))'
export const let_expression_5 = '(let [x 1] (+ x (let [x 10] x)))'

export const if_expression_1 = '(if true 1 2)'
export const if_expression_2 = '(if false 1 2)'

export const sample_expression_1 = '(sample (normal 0 1))'
export const sample_expresion_2 = '(let [x (sample (normal 0 1)) y (sample (normal x 1))] y)'

export const observe_expression_1 = '(observe (normal 0 1) 2)'

export const sample_observe_expression_1 = '(let [mu (sample (normal 0 1))] (observe (normal mu 1) 2.3) mu)' // Mean 1.150
export const sample_observe_expresion_2 = '(let [m (sample (normal 0 1))] (observe (normal m 1) 2) (observe (normal m 1) 3) m)' // Mean  1.6667
export const sample_obnserve_expresion_3 = '(let [x (sample (normal 0 1)) y (sample (normal x 1))] (observe (normal y 1) 2) x)' // Mean 0.667

export const fn_expression_1 = '(defn inc [x] (+ x 1)) (inc 5)'
export const fn_expression_2 = '(let [x 5] (let [f (fn [y] (+ x y))] (f 3)))'
export const fn_expresssion_3 = '(let [make-shift (fn [mu] (fn [x] (+ x mu)))  f (make-shift 10)] (f 3))'