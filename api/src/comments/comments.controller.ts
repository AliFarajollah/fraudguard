import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
    user: { sub: number; email: string; role: string };
}

@ApiTags('comments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller()
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) {}

    @Post('transactions/:id/comments')
    @ApiOperation({ summary: 'Add a case note to a transaction' })
    @ApiResponse({ status: 201, description: 'Comment created' })
    @ApiResponse({ status: 404, description: 'Transaction not found' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    async create(
        @Param('id', ParseIntPipe) transactionId: number,
        @Body() dto: CreateCommentDto,
        @Request() req: RequestWithUser,
    ) {
        return this.commentsService.create(transactionId, dto, req.user as any);
    }

    @Get('transactions/:id/comments')
    @ApiOperation({ summary: 'Get all case notes for a transaction' })
    @ApiResponse({ status: 200, description: 'List of comments' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    findByTransaction(@Param('id', ParseIntPipe) transactionId: number) {
        return this.commentsService.findByTransaction(transactionId);
    }

    @Delete('comments/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a comment — own comment only, admin can delete any' })
    @ApiResponse({ status: 204, description: 'Comment deleted' })
    @ApiResponse({ status: 403, description: 'Not your comment' })
    @ApiResponse({ status: 404, description: 'Comment not found' })
    @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
    async remove(
        @Param('id', ParseIntPipe) commentId: number,
        @Request() req: RequestWithUser,
    ) {
        return this.commentsService.remove(commentId, req.user as any);
    }
}
