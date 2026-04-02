<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Models\Asset;

class AssetModelTest extends TestCase
{
    public function test_asset_type_constants_are_defined(): void
    {
        $this->assertEquals('video', Asset::TYPE_VIDEO);
        $this->assertEquals('audio', Asset::TYPE_AUDIO);
        $this->assertEquals('image', Asset::TYPE_IMAGE);
        $this->assertEquals('document', Asset::TYPE_DOCUMENT);
        $this->assertEquals('archive', Asset::TYPE_ARCHIVE);
    }

    public function test_asset_status_constants_are_defined(): void
    {
        $this->assertEquals('uploading', Asset::STATUS_UPLOADING);
        $this->assertEquals('processing', Asset::STATUS_PROCESSING);
        $this->assertEquals('ready', Asset::STATUS_READY);
        $this->assertEquals('error', Asset::STATUS_ERROR);
    }
}
