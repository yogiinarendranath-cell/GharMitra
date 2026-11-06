using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GharMitra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFirstBookingOnly : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FirstBookingOnly",
                table: "Coupons",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirstBookingOnly",
                table: "Coupons");
        }
    }
}
