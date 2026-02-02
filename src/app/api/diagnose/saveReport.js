import { auth, currentUser } from '@clerk/nextjs/server';
import connectDB from '@/app/lib/mongodb';
import Report from '@/app/models/Report';

async function saveReportToDatabase(symptoms, additionalInfo, diagnosis) {
    try {
        const { userId } = await auth();
        if (!userId) {
            console.log('⚠️ No user ID - skipping report save');
            return;
        }

        const user = await currentUser();
        const userName = user?.firstName || user?.username || 'User';
        const userEmail = user?.emailAddresses?.[0]?.emailAddress;

        if (!userEmail) {
            console.log('⚠️ No user email - skipping report save');
            return;
        }

        const db = await connectDB();
        if (!db) {
            console.log('⚠️ Database not connected - skipping report save');
            return;
        }

        // Save using the Mongoose Report model
        const newReport = new Report({
            userId,
            userName,
            symptoms,
            additionalInfo: additionalInfo || '',
            diagnosis,
            urgencyLevel: diagnosis.urgencyLevel || 'low',
            createdAt: new Date()
        });

        await newReport.save();
        console.log('✅ Report saved to reports collection via Model');
    } catch (error) {
        console.error('❌ Error saving report:', error.message);
        // Don't throw - we don't want to fail the request if DB save fails
    }
}

export { saveReportToDatabase };
