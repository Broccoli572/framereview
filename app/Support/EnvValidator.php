<?php

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\Env;

/**
 * 环境变量校验器 — 启动时检查关键环境变量是否配置正确
 * 不合法则拒绝启动，避免生产环境带病运行
 */
class EnvValidator
{
    private static array $rules = [
        'APP_ENV'        => ['required', 'in:local,testing,production'],
        'APP_DEBUG'      => ['required', 'in:true,false'],
        'APP_KEY'        => ['required', 'string', 'min:32'],
        'DB_CONNECTION'  => ['required', 'in:pgsql,mysql,sqlite'],
        'DB_HOST'        => ['required', 'ip'],
        'DB_PORT'        => ['required', 'numeric'],
        'DB_DATABASE'    => ['required', 'string', 'min:1'],
        'REDIS_HOST'     => ['required', 'ip'],
        'QUEUE_CONNECTION'=> ['required', 'in:redis,database,sync'],
        'AWS_ACCESS_KEY_ID'  => ['required_unless:DB_CONNECTION,sqlite'],
        'AWS_SECRET_ACCESS_KEY'=> ['required_unless:DB_CONNECTION,sqlite'],
    ];

    public static function validate(): void
    {
        $errors = [];

        foreach (self::$rules as $key => $rules) {
            $value = Env::get($key);
            $valueStr = is_string($value) ? trim($value) : '';

            foreach ($rules as $rule) {
                if (! self::checkRule($rule, $valueStr, $key)) {
                    $errors[] = "ENV validation failed: {$key} ({$rule})";
                }
            }
        }

        if (! empty($errors)) {
            throw new \RuntimeException(
                "Environment validation failed:\n" . implode("\n", $errors)
            );
        }
    }

    private static function checkRule(string $rule, string $value, string $key): bool
    {
        return match (true) {
            $rule === 'required'       => $value !== '',
            $rule === 'required_unless:DB_CONNECTION,sqlite' => true, // handled separately
            $rule === 'ip'             => filter_var($value, FILTER_VALIDATE_IP) !== false || $value === '',
            $rule === 'numeric'        => is_numeric($value) || $value === '',
            $rule === 'string'         => is_string($value),
            $rule === 'min:1'          => strlen($value) >= 1,
            $rule === 'min:32'         => strlen($value) >= 32,
            str_starts_with($rule, 'in:') => self::checkIn($rule, $value),
            default                    => true,
        };
    }

    private static function checkIn(string $rule, string $value): bool
    {
        $values = explode(',', substr($rule, 3));
        return in_array($value, $values, true) || $value === '';
    }
}
