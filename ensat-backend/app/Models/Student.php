<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    // This property is required to allow Student::create() and update() to work
    protected $fillable = [
        'name',
        'email',
        'major',
    ];
}