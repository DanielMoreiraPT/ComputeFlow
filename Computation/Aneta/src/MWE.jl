
module ToUpercase
    function ToUpercase_f(inputs, outputs)
        println("working")
    end
end
inp = Dict()
inp["1"] = Channel(1)
out = Dict()
string = "ToUpercase.ToUpercase_f($inp, $out)"
println(string)
task1 = @async Task(eval(Meta.parse(string)))
