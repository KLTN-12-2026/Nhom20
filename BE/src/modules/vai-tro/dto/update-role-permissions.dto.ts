import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({ example: [1, 2, 3], type: [Number] })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permissionIds: number[];
}
