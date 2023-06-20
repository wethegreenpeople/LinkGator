namespace LinkGatorApi.Models
{
    public class ResultDto<T>
    {
        public bool IsSuccess { get; set; }

        public T? Value { get; set; }

        public IEnumerable<ErrorDto> Errors { get; set; }

        public ResultDto(bool isSuccess, IEnumerable<ErrorDto> errors, T value)
        {
            IsSuccess = isSuccess;
            Errors = errors;
            Value = value;
        }
    }

    public class ErrorDto
    {
        public string Message { get; set; }

        public ErrorDto(string message)
        {
            Message = message;
        }
    }

    public static class ResultDtoExtensions
    {
        public static ResultDto<T> ToResultDto<T>(this FluentResults.Result result)
        {
            if (result.IsSuccess)
                return new ResultDto<T>(true, Enumerable.Empty<ErrorDto>(), result.ToResult<T>().Value);

            return new ResultDto<T>(false, TransformErrors(result.Errors), default);
        }

        public static ResultDto<T> ToResultDto<T>(this FluentResults.Result<T> result)
        {
            if (result.IsSuccess)
                return new ResultDto<T>(true, Enumerable.Empty<ErrorDto>(), result.Value);

            return new ResultDto<T>(false, TransformErrors(result.Errors), default);
        }

        private static IEnumerable<ErrorDto> TransformErrors(List<FluentResults.IError> errors)
        {
            return errors.Select(TransformError);
        }

        private static ErrorDto TransformError(FluentResults.IError error)
        {
            return new ErrorDto(error.Message);
        }
    }
}
