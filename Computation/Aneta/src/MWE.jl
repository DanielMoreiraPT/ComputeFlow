
module ToUpercase
    function ToUpercase_f(inputs, outputs)
        println("working")
    end
end
module Run2
    # import ToUpercase
    inp = Dict()
    inp["1"] = Channel(1)
    out = Dict()
    string = "ToUpercase.ToUpercase_f($inp, $out)"
    println(string)
    task1 = Task(eval(Meta.parse(string)))
end

toUpercase_f(inputs, outputs) = println("working")
inp = Dict("1" => Channel(1))
out = Dict()
string = "toUpercase_f(inp, out)"
@async eval(Meta.parse(string))
