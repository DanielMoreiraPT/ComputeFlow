"""
# module ToUpercase
- Name = ToUpercase
- Version = "v1.0.0"
- Id = hash("ToUpercase" * "v1.0.0")
- Julia version: 
- Author: anunia
- Date: 2020-04-21

# Examples

```jldoctest
julia>
```
"""
module ToUpercase
    using JSON

################################################
#   UNMUTABLE part of module schema.
    struct Function_info
        name::String
        version::String
        id::UInt64
        Function_info(name, verion, id) =
            new(name, verion, id)
    end

    struct Port_info
        port_id
        port_type::String
        Port_info(id, type) = new(id, type)
    end

    struct InputInfo
        name::String
        version::String
        id::UInt64
        port::Port_info
        InputInfo(name, verion, id, port) =
            new(name, verion, id, port)
    end

    struct OutputInfo
        name::String
        version::String
        id::UInt64
        port::Port_info
        OurputInfo(name, verion, id, port) =
            new(name, verion, id, port)
    end

    struct IOinfo
        inputs::Array{Port_info, 1}
        outputs::Array{Port_info, 1}
        IOinfo(input_array, output_array) = new(input_array, output_array)
    end

    ToUpercase_chanel = Channel(1)
############################################
#   MUTABLE part of module schema.

    func_info = Function_info("ToUpercase", "v.1.0.0",hash("ToUpercase"*"v.1.0.0"))
    ioinfo = nothing

    struct Options
        all_text::Bool
        just_first_letters::Bool
        from_the_begging::Bool
        fb_amount_of_char::Int64
        from_the_end::Bool
        fe_amount_of_char::Int64
        Options(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char) =
            new(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char)
    end


    function set_options()
        name = "$(func_info.id)_options.json"
        options = JSON.parse(read(name,String))

        all_text = get(options,"all_text",missing)
        just_first_letters = get(options,"just_first_letters",missing)
        from_the_begging = get(options,"from_the_begging",missing)
        fb_amount_of_char = get(options,"fb_amount_of_char",missing)
        from_the_end = get(options,"from_the_end",missing)
        fe_amount_of_char = get(options,"fe_amount_of_char",missing)
        Options(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char)
    end
    function all_text(text)
        uppercase(text)
    end
    function just_first_letters(text)
        result = ""
        words = split(text, " ")
        for word in words
            if word != "" && word[1]>='a' && word[1]<='z'
                word[1] += "A" - "a"
                result *= word
            end
        end
        result
    end
    function from_the_begging(text, amount)
        if length(text) >= amount
            all_text(text)
        else
            for i = 1:amount
                text[i] += "A" - "a"
            end
        end
    end
    function from_the_end(text, amount)
        textlength = length(text)
        if textlength >= amount
            all_text(text)
        else

            for i = 1:amount
                text[textlength - i] += "A" - "a"
            end
        end
        result
    end
    function get_text()
        take!(FileReader.FileReader_chanel)
    end
################# PROGRAM #################

    println(func_info)
    options = set_options()

    text = get_text()

    if options.all_text
        all_text(text)
    else
        if options.just_first_letters
            just_first_letters(text)
        elseif options.from_the_begging
            from_the_begging(text,options.fb_amount_of_char)
        elseif options.from_the_end
            from_the_end(text, fe_amount_of_char)
        end
    end
end